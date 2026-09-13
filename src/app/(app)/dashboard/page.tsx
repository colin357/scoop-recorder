import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime, PLATFORM_LABEL } from "@/lib/utils";
import { DueBadge, Empty, IconChip, PriorityBadge, ProjectChip, SectionHeader, StatusBadge } from "@/components/ui";
import { Mascot } from "@/components/mascot";
import WeekCalendar from "@/components/week-calendar";
import { loadWeek } from "@/lib/week";
import { Icon, type IconName } from "@/components/icons";

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg();
  const [myTasks, overdueCount, recentMeetings, openCount, upcoming, calendarCount, week] = await Promise.all([
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
    loadWeek(org.id, sp.week),
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
      <section className="hero-dark relative overflow-hidden rounded-2xl text-paper shadow-lift p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-copper/30 blur-3xl" />
        <Mascot pose={pose} size={120} className="relative shrink-0" />
        <div className="relative flex-1">
          <div className="eyebrow mb-1 !text-copper">Today</div>
          <h1 className="text-3xl font-bold tracking-tight text-paper">Hey {first}.</h1>
          <p className="text-paper/70 mt-1">
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
            {calendarCount === 0 && <Link href="/settings/calendar" className="btn !bg-white/10 !text-paper hover:!bg-white/20 ring-1 ring-white/15"><Icon name="calendar" size={16} />Connect a calendar</Link>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open tasks" value={openCount} href="/tasks" icon="check" />
        <Stat label="Overdue" value={overdueCount} href="/tasks?due=overdue" tone={overdueCount ? "danger" : undefined} icon="clock" />
        <Stat label="Assigned to me" value={myTasks.length} href="/tasks?assignee=me" icon="user" />
      </div>

      {(upcoming.length > 0 || calendarCount > 0 || week.items.length > 0) && (
        <section>
          <SectionHeader title="This week" href="/settings/calendar" linkLabel="Calendar settings" />
          <WeekCalendar weekStart={week.weekStart} prev={week.prev} next={week.next} items={week.items} baseHref="/dashboard" compact />
        </section>
      )}

      <section>
        <SectionHeader title="My upcoming tasks" href="/tasks?assignee=me" />
        {myTasks.length === 0 ? (
          <Empty title="Nothing assigned to you right now." pose="sleep" compact>Tasks generated from meetings will show up here.</Empty>
        ) : (
          <ul className="card divide-y divide-line/60">
            {myTasks.map((t) => (
              <li key={t.id} className="p-4 flex items-center gap-4 row-hover">
                <IconChip name="check" size={36} />
                <div className="flex-1 min-w-0">
                  <Link href={`/tasks/${t.id}`} className="font-medium hover:underline block truncate">{t.title}</Link>
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
        <SectionHeader title="Recent meetings" href="/meetings" />
        {recentMeetings.length === 0 ? (
          <Empty title="No meetings recorded yet." pose="listen" compact action={<Link href="/meetings/new" className="btn-primary">Record a meeting</Link>}>Paste a Google Meet, Zoom or Teams link to send the recorder.</Empty>
        ) : (
          <ul className="card divide-y divide-line/60">
            {recentMeetings.map((m) => (
              <li key={m.id} className="p-4 flex items-center gap-4 row-hover">
                <IconChip name="video" size={36} />
                <div className="flex-1 min-w-0">
                  <Link href={`/meetings/${m.id}`} className="font-medium hover:underline block truncate">{m.title}</Link>
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
    <Link href={href} className="card p-4 hover:-translate-y-0.5 hover:shadow-lift transition flex items-center gap-4">
      <IconChip name={icon} tone={tone === "danger" ? "danger" : "neutral"} />
      <div>
        <div className="text-sm text-muted">{label}</div>
        <div className={`text-3xl font-display font-bold leading-none ${tone === "danger" ? "text-clay" : ""}`}>{value}</div>
      </div>
    </Link>
  );
}
