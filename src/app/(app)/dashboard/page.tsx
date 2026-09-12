import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime, PLATFORM_LABEL } from "@/lib/utils";
import { DueBadge, Empty, PriorityBadge, ProjectChip, StatusBadge } from "@/components/ui";

export default async function Dashboard() {
  const { org, membership } = await requireOrg();
  const [myTasks, overdueCount, recentMeetings, openCount] = await Promise.all([
    db.task.findMany({
      where: { orgId: org.id, assigneeId: membership.id, status: { not: "done" } },
      include: { project: true },
      orderBy: [{ dueDate: "asc" }],
      take: 8,
    }),
    db.task.count({ where: { orgId: org.id, status: { not: "done" }, dueDate: { lt: new Date() } } }),
    db.meeting.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { tasks: true } } } }),
    db.task.count({ where: { orgId: org.id, status: { not: "done" } } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good to see you, {membership.name.split(" ")[0]}</h1>
          <p className="text-slate-500 text-sm">Here is what came out of your team&apos;s recent meetings.</p>
        </div>
        <Link href="/meetings/new" className="btn-primary">+ Record a meeting</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open tasks" value={openCount} href="/tasks" />
        <Stat label="Overdue" value={overdueCount} href="/tasks?due=overdue" tone={overdueCount ? "danger" : undefined} />
        <Stat label="Assigned to me" value={myTasks.length} href="/tasks?assignee=me" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">My upcoming tasks</h2>
          <Link href="/tasks?assignee=me" className="text-sm text-indigo-600">View all</Link>
        </div>
        {myTasks.length === 0 ? (
          <Empty title="Nothing assigned to you right now.">Tasks generated from meetings will show up here.</Empty>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {myTasks.map((t) => (
              <li key={t.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/tasks/${t.id}`} className="font-medium hover:text-indigo-600 block truncate">{t.title}</Link>
                  <div className="flex gap-3 mt-1"><ProjectChip project={t.project} /><DueBadge date={t.dueDate} /></div>
                </div>
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent meetings</h2>
          <Link href="/meetings" className="text-sm text-indigo-600">View all</Link>
        </div>
        {recentMeetings.length === 0 ? (
          <Empty title="No meetings recorded yet.">Paste a Google Meet, Zoom or Teams link to send the recorder.</Empty>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {recentMeetings.map((m) => (
              <li key={m.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/meetings/${m.id}`} className="font-medium hover:text-indigo-600 block truncate">{m.title}</Link>
                  <div className="text-xs text-slate-500">{PLATFORM_LABEL[m.platform]} · {fmtDateTime(m.startedAt ?? m.scheduledAt ?? m.createdAt)} · {m._count.tasks} tasks</div>
                </div>
                <StatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "danger" }) {
  return (
    <Link href={href} className="card p-4 hover:border-indigo-300">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-3xl font-semibold ${tone === "danger" ? "text-red-600" : ""}`}>{value}</div>
    </Link>
  );
}
