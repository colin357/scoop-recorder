/**
 * Provider abstraction. Two things the app needs from a model:
 *   1. structured(): a JSON object that validates against a Zod schema
 *   2. chat(): free-form text for the "Ask AI" conversation
 *
 * Providers:
 *   - xai       Grok via xAI's OpenAI-compatible API (XAI_API_KEY)
 *   - anthropic Claude via the Anthropic SDK (ANTHROPIC_API_KEY)
 *
 * Selection: AI_PROVIDER env var, else whichever key is present (xAI wins if both).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { z } from "zod";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Usage = { inputTokens: number; outputTokens: number };
export let lastUsage: Usage | null = null;

export type LLM = {
  name: string;
  model: string;
  structured<T extends z.ZodType>(input: { schema: T; schemaName: string; system: string; user: string }): Promise<z.infer<T>>;
  chat(input: { system: string; context: string; history: ChatMessage[]; question: string }): Promise<string>;
};

export type ProviderName = "xai" | "anthropic";

export function resolveProvider(): ProviderName | null {
  const forced = process.env.AI_PROVIDER as ProviderName | undefined;
  if (forced === "xai" || forced === "anthropic") return forced;
  if (process.env.XAI_API_KEY) return "xai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function aiConfigured() {
  return resolveProvider() !== null;
}

let cached: LLM | null = null;
export function getLLM(): LLM {
  if (cached) return cached;
  const provider = resolveProvider();
  if (!provider) {
    throw new Error("No AI provider configured. Set XAI_API_KEY (Grok) or ANTHROPIC_API_KEY (Claude) in .env.");
  }
  cached = provider === "xai" ? xaiProvider() : anthropicProvider();
  return cached;
}

// ---------------- xAI / Grok ----------------

function xaiProvider(): LLM {
  const model = process.env.XAI_MODEL ?? "grok-4";
  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: process.env.XAI_BASE_URL ?? "https://api.x.ai/v1",
  });

  return {
    name: "xai",
    model,
    async structured({ schema, schemaName, system, user }) {
      const jsonSchema = stripUnsupportedKeywords(z.toJSONSchema(schema, { target: "draft-7" })) as Record<string, unknown>;
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema: jsonSchema },
        },
      });
      lastUsage = { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 };
      const choice = res.choices[0];
      const text = choice?.message?.content;
      if (!text) throw new Error(`Grok returned no content (finish_reason=${choice?.finish_reason ?? "unknown"})`);
      return schema.parse(JSON.parse(text));
    },
    async chat({ system, context, history, question }) {
      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: `${system}\n\n${context}` },
          ...history,
          { role: "user", content: question },
        ],
      });
      return res.choices[0]?.message?.content?.trim() ?? "";
    },
  };
}

/** OpenAI-style strict JSON schema mode rejects numeric range keywords; drop them (values are clamped downstream). */
function stripUnsupportedKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupportedKeywords);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "minimum" || k === "maximum" || k === "$schema") continue;
      out[k] = stripUnsupportedKeywords(v);
    }
    return out;
  }
  return node;
}

// ---------------- Anthropic / Claude ----------------

function anthropicProvider(): LLM {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
  const client = new Anthropic();

  return {
    name: "anthropic",
    model,
    async structured({ schema, system, user }) {
      const response = await client.messages.parse({
        model,
        max_tokens: 16000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(schema) },
      });
      lastUsage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
      if (response.stop_reason === "refusal") throw new Error("The model declined to analyze this transcript.");
      if (!response.parsed_output) throw new Error("Could not parse model output.");
      return response.parsed_output;
    },
    async chat({ system, context, history, question }) {
      const response = await client.messages.create({
        model,
        max_tokens: 4000,
        system: [
          { type: "text", text: system },
          { type: "text", text: context, cache_control: { type: "ephemeral" } },
        ],
        messages: [...history, { role: "user", content: question }],
      });
      if (response.stop_reason === "refusal") return "I can't help with that question.";
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    },
  };
}
