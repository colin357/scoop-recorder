import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { recallConfigured } from "@/lib/recall";
import { resolveProvider } from "@/lib/llm";
import NewMeetingForms from "./forms";
import PhoneCallForm from "./phone-call-form";
import { scoopNumber, twilioConfigured } from "@/lib/twilio";

// Server actions on this page run the AI pipeline; allow long executions on Vercel.
export const maxDuration = 300;

export default async function NewMeetingPage() {
  const { org, user } = await requireOrg();
  const projects = await db.project.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } });
  const phoneReady = twilioConfigured();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Record a meeting</h1>
        <p className="text-muted text-sm">
          Paste a Google Meet, Zoom or Microsoft Teams link{phoneReady ? ", or have Rocky call someone" : ""}. Rocky records the call, and when it ends you get a summary and assigned tasks.
        </p>
      </div>
      {phoneReady && <PhoneCallForm myPhone={user.phoneVerifiedAt ? user.phone : null} rockyNumber={scoopNumber()} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />}
      <NewMeetingForms projects={projects.map((p) => ({ id: p.id, name: p.name }))} botAvailable={recallConfigured()} aiProvider={resolveProvider()} />
    </div>
  );
}
