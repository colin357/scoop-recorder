import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { recallConfigured } from "@/lib/recall";
import { resolveProvider } from "@/lib/llm";
import NewMeetingForms from "./forms";
import { activeProjectsByRecency } from "@/lib/projects";

// Server actions on this page run the AI pipeline; allow long executions on Vercel.
export const maxDuration = 300;

export default async function NewMeetingPage() {
  const { org } = await requireOrg();
  const projects = await activeProjectsByRecency(org.id);
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Record a meeting</h1>
        <p className="text-muted text-sm">
          Paste a Google Meet, Zoom or Microsoft Teams link. Our notetaker joins the call, records it, and when it ends you get a summary and assigned tasks. Recording a phone call? Use <Link href="/calls" className="underline">Calls</Link>.
        </p>
      </div>
      <NewMeetingForms projects={projects.map((p) => ({ id: p.id, name: p.name }))} botAvailable={recallConfigured()} aiProvider={resolveProvider()} />
    </div>
  );
}
