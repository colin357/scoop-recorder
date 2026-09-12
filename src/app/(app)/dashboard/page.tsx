import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime, PLATFORM_LABEL } from "@/lib/utils";
import { DueBadge, Empty, PriorityBadge, ProjectChip, StatusBadge } from "@/components/ui";
import { Mascot } from "@/components/mascot";
import UpcomingList from "@/components/upcoming-list";
import { Icon, type IconName } from "@/components/icons";

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg();
  const [myTasks, overdueCount, recentMeetings, openCount, upcoming, calendarCount] = await Promise.all([
    db.task.findMany({
      where: { orgId: org.id, assigneeId: membership.id, status: { notIn: ["done", "draft"] } },
      include: { project: true },
      orderBy: [{ dueDate: "asc" }],
      take: 8,
    }),
    db.task.count({ where: { orgId: org.id, status: { notIn: ["done", "draft"] }, dueDate: { lt: new Date() } } }),
    db.meeting.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { tasks: true } } } }),
    db.task.count({ where: { orgId: org.id, status: { notIn: ["done", "draft"] } } }),
    db.calendarEvent.findMany({ where: { orgId: org.id, endAt: { gt: new Date() } }, orderBy: { startAt: "asc" }, take: 6, include: { meeting: { select: { id: true, status: true } } } }),
    db.calendarConnection.count({ where: { orgId: org.id } }),
  ]);
  const undecided = upcoming.filter((e) => e.decision === "undecided").length;
  const first = membership.name.split(" ")[0];
  const pose = overdueCount > 0 ? "think" : openCount === 0 ? "celebrate" : "wave";

  return (
    <div className="space-y-8">
      {sp.calendar === "connected" && (
        <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">
          Calendar connected. Rocky is syncing your upcoming meetings now and will ask before recording each one. Change that under Calendar settings.
        </p>
      )}
      <section className="hero relative overflow-hidden rounded-2xl border-2 border-ink shadow-[4px_4px_0_0_#171b26] p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <Mascot pose={pose} size={120} className="relative shrink-0" />
        <div className="relative flex-1">
          <div className="eyebrow mb-1">Today</div>
          <h1 className="text-3xl font-bold tracking-tight">Hey {first}.</h1>
          <p className="text-ink-soft mt-1">
            {overdueCount > 0
              ? `${overdueCount} task${overdueCount === 1 ? " is" : "s are"} overdue. Let's knock those out first.`
              : openCount === 0
              ? "Inbox zero for tasks. Record a meeting and I'll find the next ones."
              : undecided > 0
              ? `${undecided} upcoming meeting${undecided === 1 ? "" : "s"} need${undecided === 1 ? "s" : ""} a record-or-skip call from you.`
              : "Everything from your recent meetings is sorted below."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link href="/meetings/new" className="btn-accent"><Icon name="mic" size={16} />Record a meeting</Link>
            {calendarCount === 0 && <Link href="/settings/calendar" className="btn-secondary"><Icon name="calendar" size={16} />Connect a calendar</Link>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open tasks" value={openCount} href="/tasks" icon="check" />
        <Stat label="Overdue" value={overdueCount} href="/tasks?due=overdue" tone={overdueCount ? "danger" : undefined} icon="clock" />
        <Stat label="Assigned to me" value={myTasks.length} href="/tasks?assignee=me" icon="user" />
      </div>

      {(upcoming.length > 0 || calendarCount > 0) && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Upcoming meetings</h2>
            <Link href="/settings/calendar" className="text-sm text-merle">Calendar settings</Link>
          </div>
          {upcoming.length === 0 ? (
            <Empty title="No meetings with a video link in the next 7 days." />
          ) : (
            <div className="card px-4">
              <UpcomingList events={upcoming.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt.toISOString(), platform: PLATFORM_LABEL[e.platform], decision: e.decision, meeting: e.meeting, when: fmtDateTime(e.startAt) }))} />
            </div>
          )}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">My upcoming tasks</h2>
          <Link href="/tasks?assignee=me" className="text-sm text-merle">View all</Link>
        </div>
        {myTasks.length === 0 ? (
          <Empty title="Nothing assigned to you right now." pose="sleep">Tasks generated from meetings will show up here.</Empty>
        ) : (
          <ul className="card divide-y divide-line/60">
            {myTasks.map((t) => (
              <li key={t.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/tasks/${t.id}`} className="font-medium hover:text-merle block truncate">{t.title}</Link>
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
          <Link href="/meetings" className="text-sm text-merle">View all</Link>
        </div>
        {recentMeetings.length === 0 ? (
          <Empty title="No meetings recorded yet." pose="listen">Paste a Google Meet, Zoom or Teams link to send the recorder.</Empty>
        ) : (
          <ul className="card divide-y divide-line/60">
            {recentMeetings.map((m) => (
              <li key={m.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/meetings/${m.id}`} className="font-medium hover:text-merle block truncate">{m.title}</Link>
                  <div className="text-xs text-muted">{PLATFORM_LABEL[m.platform]} · {fmtDateTime(m.startedAt ?? m.scheduledAt ?? m.createdAt)} · {m._count.tasks} tasks</div>
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

function Stat({ label, value, href, tone, icon }: { label: string; value: number; href: string; tone?: "danger"; icon: IconName }) {
  return (
    <Link href={href} className="card p-4 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#171b26] transition flex items-center gap-4">
      <span className={`h-11 w-11 rounded-xl border-2 border-ink flex items-center justify-center ${tone === "danger" ? "bg-clay-soft text-clay" : "bg-sky text-merle"}`}><Icon name={icon} size={22} /></span>
      <div>
        <div className="text-sm text-muted">{label}</div>
        <div className={`text-3xl font-display font-bold leading-none ${tone === "danger" ? "text-clay" : ""}`}>{value}</div>
      </div>
    </Link>
  );
}
