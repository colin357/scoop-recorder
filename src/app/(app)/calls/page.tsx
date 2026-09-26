import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime } from "@/lib/utils";
import { formatPhone } from "@/lib/phone-format";
import { scoopNumber, twilioConfigured } from "@/lib/twilio";
import { Empty, PageHeader, ProjectChip, StatusBadge } from "@/components/ui";
import MeetingThumb from "@/components/meeting-thumb";
import { Icon } from "@/components/icons";
import PhoneCallForm from "./phone-call-form";
import { activeProjectsByRecency } from "@/lib/projects";

/** Phone calls: place a "Call with Rocky" call, see how to merge Rocky in, and browse past calls. */
export default async function CallsPage() {
  const { org, user, membership } = await requireOrg();
  const ready = twilioConfigured();
  const [calls, projects] = await Promise.all([
    db.meeting.findMany({
      where: { orgId: org.id, platform: "phone" },
      orderBy: [{ startedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      include: { project: true, attendees: { orderBy: { id: "asc" } }, _count: { select: { tasks: true } } },
    }),
    activeProjectsByRecency(org.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Calls" count={calls.length} />

      {ready ? (
        <div className="max-w-xl">
          <PhoneCallForm myPhone={user.phoneVerifiedAt ? user.phone : null} rockyNumber={scoopNumber()} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      ) : (
        <Empty title="Phone calls aren't switched on yet." pose="listen">
          {membership.isAdmin ? "Add the Twilio and Deepgram keys to the app's environment to turn them on. The steps are in docs/phone-calls.md." : "Ask an admin to turn on phone calls for your workspace."}
        </Empty>
      )}

      <section>
        <h2 className="font-semibold mb-3">Recent calls</h2>
        {calls.length === 0 ? (
          <p className="text-sm text-muted">No calls recorded yet.</p>
        ) : (
          <ul className="card divide-y divide-line/60 overflow-hidden">
            {calls.map((c) => {
              const other = c.attendees[1]?.name ?? (c.phoneContact ? formatPhone(c.phoneContact) : null);
              return (
                <li key={c.id}>
                  <Link href={`/meetings/${c.id}`} className="p-4 flex items-center gap-4 row-hover">
                    <MeetingThumb id={c.id} thumbnail={null} hasRecording={false} phone className="w-20 sm:w-24" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
                        <span>{c.callKind === "merge" ? "Merged in" : other ? `With ${other}` : "Call with Rocky"}</span>
                        <span className="whitespace-nowrap">{fmtDateTime(c.startedAt ?? c.scheduledAt ?? c.createdAt)}</span>
                        {c.durationSec != null && <span>{Math.max(1, Math.round(c.durationSec / 60))} min</span>}
                        <ProjectChip project={c.project} />
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex badge bg-paper-2 text-ink-soft gap-1"><Icon name="check" size={12} />{c._count.tasks} task{c._count.tasks === 1 ? "" : "s"}</span>
                    <StatusBadge status={c.status} />
                    <Icon name="chevron" size={16} className="-rotate-90 text-muted hidden sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
