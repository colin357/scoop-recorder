import { z } from "zod";
import { getLLM } from "./llm";

export const DraftSchema = z.object({
  orgName: z.string().nullable(),
  businessDescription: z.string().nullable().describe("What the company does, who its clients are, current initiatives. 2-5 sentences."),
  members: z.array(
    z.object({
      name: z.string(),
      email: z.string().nullable(),
      role: z.string(),
      responsibilities: z.string().describe("What tasks this person typically handles."),
    }),
  ),
  projects: z.array(z.object({ name: z.string(), description: z.string(), confirmed: z.boolean() })),
});
export type OnboardingDraftData = z.infer<typeof DraftSchema>;

export const emptyDraft: OnboardingDraftData = { orgName: null, businessDescription: null, members: [], projects: [] };

export const TurnSchema = z.object({
  reply: z.string().describe("Your next message to the user. Friendly, short, one question at a time."),
  draft: DraftSchema.describe("The full updated draft, merging everything learned so far."),
  widget: z
    .enum(["none", "team", "projects", "finish"])
    .describe("A form to show under your reply: 'team' to collect several team members at once, 'projects' to confirm proposed projects, 'finish' when everything is gathered."),
});
export type OnboardingTurn = z.infer<typeof TurnSchema>;

export type ChatMessage = { role: "user" | "assistant"; content: string; widget?: OnboardingTurn["widget"] };

const SYSTEM = `You are Rocky, a friendly Australian Shepherd who is the mascot and onboarding guide for Scoop, a meeting-recorder app that turns meetings into assigned tasks.
Your job is to learn about the user's company in a natural conversation and fill in a draft. Be warm, concise, and ask ONE thing at a time. Never ask for information already in the draft.

Gather, roughly in this order:
1. Company name (draft.orgName).
2. What the business does, who its clients are, and what it is working on right now (draft.businessDescription). Ask one or two follow-ups so the description is specific enough to guess projects from.
3. The team. Once you know who is on the team, show widget "team" so they can enter names, emails, roles and what each person typically handles in one go. If they describe people in chat, add them to draft.members yourself and only use the widget to fill gaps (emails, responsibilities).
4. Projects. Propose 2-6 projects inferred from the business description and what they mentioned (clients, product lines, initiatives, internal functions). Put them in draft.projects with confirmed=false and show widget "projects" so they can confirm or edit.
5. When orgName, businessDescription, at least one member, and at least one confirmed project exist, say you're all set and show widget "finish".

Rules:
- Always return the complete draft, not just changes. Keep previously gathered data.
- The person you're chatting with is the first team member; they are already in draft.members. Ask for their role and responsibilities early if missing.
- Emails may be null if unknown; do not invent emails.
- Keep replies under 80 words.`;

export async function onboardingTurn(input: { history: ChatMessage[]; draft: OnboardingDraftData; userMessage: string; userName: string; userEmail: string }) {
  const transcript = [...input.history, { role: "user" as const, content: input.userMessage }]
    .map((m) => `${m.role === "user" ? "User" : "Rocky"}: ${m.content}${m.widget && m.widget !== "none" ? ` [showed widget: ${m.widget}]` : ""}`)
    .join("\n");
  const user = `Signed-in user: ${input.userName} <${input.userEmail}>

Current draft (JSON):
${JSON.stringify(input.draft, null, 2)}

Conversation so far:
${transcript}

Respond with your next reply, the updated draft, and which widget (if any) to show.`;
  return getLLM().structured({ schema: TurnSchema, schemaName: "onboarding_turn", system: SYSTEM, user });
}

/** Standalone project suggestions for the Projects page. */
export const ProjectSuggestionsSchema = z.object({
  projects: z.array(z.object({ name: z.string(), description: z.string(), reason: z.string() })),
});

export async function suggestProjects(input: {
  businessDescription: string | null;
  existingProjects: { name: string; description: string | null }[];
  recentMeetings: { title: string; summary: string | null }[];
}) {
  const system = `You help a team organize work into projects. Given a business description, existing projects, and recent meeting summaries, propose NEW projects that are clearly missing. A project is a client, product line, initiative, or recurring function that tasks naturally group under. Do not repeat existing projects or propose near-duplicates. Propose 0-6 projects; propose none if nothing is missing.`;
  const user = `Business description:
${input.businessDescription ?? "(none provided)"}

Existing projects:
${input.existingProjects.map((p) => `- ${p.name}${p.description ? ` — ${p.description}` : ""}`).join("\n") || "(none)"}

Recent meetings:
${input.recentMeetings.map((m) => `- ${m.title}: ${m.summary ?? "(no summary)"}`).join("\n") || "(none)"}`;
  return getLLM().structured({ schema: ProjectSuggestionsSchema, schemaName: "project_suggestions", system, user });
}
