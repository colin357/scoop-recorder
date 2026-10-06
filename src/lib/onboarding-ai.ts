import { z } from "zod";
import { getLLM } from "./llm";

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
