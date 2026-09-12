import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime, PLATFORM_LABEL } from "@/lib/utils";
import { Empty, ProjectChip, StatusBadge } from "@/components/ui";

export default async function MeetingsPage() {
  const { org } = await requireOrg();
  const meetings = await db.meeting.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { project: true, _count: { select: { tasks: true } } },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <Link href="/meetings/new" className="btn-primary">+ Record a meeting</Link>
      </div>
      {meetings.length === 0 ? (
        <Empty title="No meetings yet." pose="listen">Send the recorder to your next call, or import a transcript to try it out.</Empty>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {meetings.map((m) => (
            <li key={m.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Link href={`/meetings/${m.id}`} className="font-medium hover:text-indigo-600 block truncate">{m.title}</Link>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{PLATFORM_LABEL[m.platform]}</span>
                  <span>{fmtDateTime(m.startedAt ?? m.scheduledAt ?? m.createdAt)}</span>
                  <span>{m._count.tasks} tasks</span>
                  <ProjectChip project={m.project} />
                </div>
              </div>
              <StatusBadge status={m.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
