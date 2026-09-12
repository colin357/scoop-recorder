import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { TranscriptSegment } from "./recall";
import { fmtTimestamp } from "./utils";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

export type TeamMemberContext = {
  id: string;
  name: string;
  role: string;
  responsibilities: string;
};

export type ProjectContext = { id: string; name: string; description: string | null };

export const MeetingAnalysisSchema = z.object({
  summary: z.string().describe("3-6 sentence narrative summary of the meeting."),
  keyPoints: z.array(z.string()).describe("Bullet points of the most important things discussed."),
  decisions: z.array(z.string()).describe("Concrete decisions that were made."),
  projectId: z
    .string()
    .nullable()
    .describe("ID of the project this meeting most relates to, or null if none fit."),
  tasks: z.array(
    z.object({
      title: z.string().describe("Short imperative title, max 80 chars."),
      description: z
        .string()
        .describe("What needs to be done and why, with enough context to act on without rewatching."),
      assigneeId: z
        .string()
        .nullable()
        .describe("ID of the team member best suited, based on role and responsibilities. Null if nobody fits."),
      assignmentReason: z.string().describe("One sentence on why this person and this deadline."),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      dueInDays: z
        .number()
        .int()
        .min(0)
        .max(90)
        .describe("Days from the meeting date until this is due. Use any explicit deadline mentioned; otherwise estimate from urgency and scope."),
      sourceTimestampSec: z
        .number()
        .int()
        .nullable()
        .describe("Seconds into the recording where this was discussed."),
      sourceQuote: z.string().describe("Short verbatim quote from the transcript that produced this task."),
      steps: z
        .array(
          z.object({
            title: z.string(),
            details: z.string().nullable(),
            dueInDays: z
              .number()
              .int()
              .min(0)
              .max(90)
              .describe("Days from the meeting date until this step should be done. Must not exceed the task's dueInDays."),
          }),
        )
        .describe("2-6 step-by-step guide to accomplish the task."),
    }),
  ),
});

export type MeetingAnalysis = z.infer<typeof MeetingAnalysisSchema>;

export function transcriptToText(segments: TranscriptSegment[]) {
  return segments.map((s) => `[${fmtTimestamp(s.startSec)}] ${s.speaker}: ${s.text}`).join("\n");
}

function teamBlock(team: TeamMemberContext[]) {
  if (!team.length) return "(no team members configured)";
  return team
    .map((m) => `- id=${m.id} | ${m.name} — ${m.role}\n  Typically handles: ${m.responsibilities}`)
    .join("\n");
}

function projectBlock(projects: ProjectContext[]) {
  if (!projects.length) return "(no projects configured)";
  return projects.map((p) => `- id=${p.id} | ${p.name}${p.description ? ` — ${p.description}` : ""}`).join("\n");
}

const ANALYSIS_SYSTEM = `You are the meeting intelligence engine for a team's meeting recorder.
You receive a meeting transcript plus the team roster (with roles and typical responsibilities) and the team's projects.

Produce:
1. A faithful summary, key points, and decisions. Do not invent things that were not said.
2. Action items as tasks. Every commitment, request, or follow-up in the transcript becomes a task. Skip vague musings that nobody committed to.
3. For each task, choose the assignee whose role and responsibilities best match the work. If someone in the meeting explicitly volunteered or was asked by name, prefer them if they are on the roster. Explain the choice in assignmentReason.
4. Deadlines: if a date or timeframe is stated, use it. Otherwise estimate a realistic deadline from scope and urgency (small follow-ups: 1-3 days; medium work: about a week; larger deliverables: 2-4 weeks).
5. A step-by-step guide per task, with each step's own deadline spread sensibly before the task deadline.
6. Timestamps and quotes must point at the actual place in the transcript where the item was raised.
7. Pick the single most relevant project for the meeting, or null.`;

export async function analyzeMeeting(input: {
  title: string;
  meetingDate: Date;
  transcript: TranscriptSegment[];
  team: TeamMemberContext[];
  projects: ProjectContext[];
}): Promise<MeetingAnalysis> {
  const userText = `Meeting title: ${input.title}
Meeting date: ${input.meetingDate.toISOString().slice(0, 10)}

Team roster:
${teamBlock(input.team)}

Projects:
${projectBlock(input.projects)}

Transcript:
${transcriptToText(input.transcript)}`;

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: ANALYSIS_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
    output_config: { format: zodOutputFormat(MeetingAnalysisSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to analyze this transcript.");
  }
  if (!response.parsed_output) throw new Error("Could not parse meeting analysis.");

  const analysis = response.parsed_output;
  const validMembers = new Set(input.team.map((m) => m.id));
  const validProjects = new Set(input.projects.map((p) => p.id));
  // The model can only assign to real IDs; scrub anything else.
  analysis.projectId = analysis.projectId && validProjects.has(analysis.projectId) ? analysis.projectId : null;
  for (const t of analysis.tasks) {
    if (t.assigneeId && !validMembers.has(t.assigneeId)) t.assigneeId = null;
    for (const s of t.steps) s.dueInDays = Math.min(s.dueInDays, t.dueInDays);
  }
  return analysis;
}

const TASK_CHAT_SYSTEM = `You are a helpful assistant embedded in a team's task manager.
A team member is asking about a task that was generated from a recorded meeting.
Answer using the meeting transcript, summary, and task details provided. Cite timestamps like [12:34] when you refer to something said in the meeting so the user can jump to it in the recording.
If the transcript does not cover what they ask, say so plainly instead of guessing.
Keep answers concise and practical.`;

export async function askAboutTask(input: {
  task: {
    title: string;
    description: string;
    dueDate: Date | null;
    assigneeName: string | null;
    steps: { title: string; details: string | null; dueDate: Date | null }[];
  };
  meeting: { title: string; summary: string | null; transcript: TranscriptSegment[] } | null;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}) {
  const context = `Task: ${input.task.title}
Assignee: ${input.task.assigneeName ?? "Unassigned"}
Due: ${input.task.dueDate ? input.task.dueDate.toISOString().slice(0, 10) : "not set"}
Description: ${input.task.description}
Steps:
${input.task.steps.map((s, i) => `${i + 1}. ${s.title}${s.details ? ` — ${s.details}` : ""}${s.dueDate ? ` (due ${s.dueDate.toISOString().slice(0, 10)})` : ""}`).join("\n") || "(none)"}

${
  input.meeting
    ? `Source meeting: ${input.meeting.title}
Summary: ${input.meeting.summary ?? "(none)"}

Transcript:
${transcriptToText(input.meeting.transcript)}`
    : "This task has no source meeting."
}`;

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [
      { type: "text", text: TASK_CHAT_SYSTEM },
      { type: "text", text: context, cache_control: { type: "ephemeral" } },
    ],
    messages: [...input.history, { role: "user", content: input.question }],
  });

  if (response.stop_reason === "refusal") return "I can't help with that question.";
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
