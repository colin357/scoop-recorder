import { addDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { db } from "./db";
import { PLATFORM_LABEL } from "./utils";

export type WeekItem = {
  id: string;
  kind: "event" | "meeting";
  title: string;
  startAt: string;
  endAt: string;
  platform: string;
  decision: string | null;
  meeting: { id: string; status: string } | null;
};

/**
 * Everything that belongs on the week calendar: calendar events with a video
 * link (upcoming, with their record/skip decision) plus recorded or scheduled
 * meetings that did not come from the calendar. The query is padded by a day
 * on each side so the browser can bucket by local date.
 */
export async function loadWeek(orgId: string, weekParam?: string | string[]) {
  const raw = typeof weekParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? parseISO(weekParam) : new Date();
  const weekStart = startOfWeek(raw, { weekStartsOn: 1 });
  const from = subDays(weekStart, 1);
  const to = addDays(weekStart, 8);

  const [events, meetings] = await Promise.all([
    db.calendarEvent.findMany({ where: { orgId, startAt: { gte: from, lt: to } }, include: { meeting: { select: { id: true, status: true } } }, orderBy: { startAt: "asc" } }),
    db.meeting.findMany({
      where: { orgId, calendarEvent: null, OR: [{ startedAt: { gte: from, lt: to } }, { startedAt: null, scheduledAt: { gte: from, lt: to } }] },
      select: { id: true, title: true, status: true, platform: true, startedAt: true, scheduledAt: true, endedAt: true, durationSec: true, createdAt: true },
    }),
  ]);

  const items: WeekItem[] = [
    ...events.map((e) => ({
      id: e.id, kind: "event" as const, title: e.title, startAt: e.startAt.toISOString(), endAt: e.endAt.toISOString(),
      platform: PLATFORM_LABEL[e.platform] ?? e.platform, decision: e.decision, meeting: e.meeting,
    })),
    ...meetings.map((m) => {
      const start = m.startedAt ?? m.scheduledAt ?? m.createdAt;
      const end = m.endedAt ?? new Date(start.getTime() + (m.durationSec ?? 1800) * 1000);
      return { id: m.id, kind: "meeting" as const, title: m.title, startAt: start.toISOString(), endAt: end.toISOString(), platform: PLATFORM_LABEL[m.platform] ?? m.platform, decision: null, meeting: { id: m.id, status: m.status } };
    }),
  ];

  return {
    weekStart: format(weekStart, "yyyy-MM-dd"),
    prev: format(subDays(weekStart, 7), "yyyy-MM-dd"),
    next: format(addDays(weekStart, 7), "yyyy-MM-dd"),
    items,
  };
}
