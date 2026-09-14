import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime, PLATFORM_LABEL } from "@/lib/utils";
import { Empty, IconChip, PageHeader, ProjectChip, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function MeetingsPage() {
  const { org } = await requireOrg();
  const meetings = await db.meeting.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { project: true, _count: { select: { tasks: true, attendees: true } } },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        count={meetings.length}
        description="Every call Rocky recorded or transcript you imported, with its summary and the tasks it produced."
        actions={<Link href="/meetings/new" className="btn-primary"><Icon name="mic" size={16} />Record a meeting</Link>}
      />
      {meetings.length === 0 ? (
        <Empty title="No meetings yet." pose="listen" action={<><Link href="/meetings/new" className="btn-primary"><Icon name="mic" size={16} />Record a meeting</Link><Link href="/settings/calendar" className="btn-secondary">Connect a calendar</Link></>}>
          Send the recorder to your next call, or import a transcript to try it out.
        </Empty>
      ) : (
        <ul className="card divide-y divide-line/60 overflow-hidden">
          {meetings.map((m) => (
            <li key={m.id}>
              <Link href={`/meetings/${m.id}`} className="p-4 flex items-center gap-4 row-hover">
                <IconChip name="video" size={40} tone={m.status === "recording" ? "accent" : "neutral"} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
                    <span>{PLATFORM_LABEL[m.platform]}</span>
                    <span>{fmtDateTime(m.startedAt ?? m.scheduledAt ?? m.createdAt)}</span>
                    {m.durationSec != null && <span>{Math.round(m.durationSec / 60)} min</span>}
                    <ProjectChip project={m.project} />
                  </div>
                </div>
                <span className="hidden sm:inline-flex badge bg-paper-2 text-ink-soft gap-1"><Icon name="check" size={12} />{m._count.tasks} task{m._count.tasks === 1 ? "" : "s"}</span>
                <StatusBadge status={m.status} />
                <Icon name="chevron" size={16} className="-rotate-90 text-muted hidden sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
