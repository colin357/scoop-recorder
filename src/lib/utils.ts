import { format, formatDistanceToNow, isPast } from "date-fns";
import { dayKey, requestTimeZone } from "./tz";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function zonedParts(d: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(d);
  const g = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "";
  return { month: g("month"), day: g("day"), year: g("year"), hour: g("hour"), minute: g("minute"), period: g("dayPeriod") };
}

/** "Sep 14, 2026" in the viewer's zone (server) or the local clock (browser). */
export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  const tz = requestTimeZone();
  if (!tz) return format(date, "MMM d, yyyy");
  const p = zonedParts(date, tz);
  return `${p.month} ${p.day}, ${p.year}`;
}

/** "Sep 14, 2026 3:03 PM" in the viewer's zone (server) or the local clock (browser). */
export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  const tz = requestTimeZone();
  if (!tz) return format(date, "MMM d, yyyy h:mm a");
  const p = zonedParts(date, tz);
  return `${p.month} ${p.day}, ${p.year} ${p.hour}:${p.minute} ${p.period}`;
}

export function fmtRelative(d: Date | string | null | undefined) {
  if (!d) return "";
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}

export function dueLabel(d: Date | null | undefined, status?: string) {
  if (!d) return { label: "No due date", tone: "muted" as const };
  const date = new Date(d);
  if (status === "done") return { label: fmtDate(date), tone: "muted" as const };
  const tz = requestTimeZone();
  const now = new Date();
  const key = dayKey(date, tz);
  if (key === dayKey(now, tz)) return { label: "Due today", tone: "warn" as const };
  if (key === dayKey(new Date(now.getTime() + 86400000), tz)) return { label: "Due tomorrow", tone: "warn" as const };
  if (isPast(date)) return { label: `Overdue · ${fmtDate(date)}`, tone: "danger" as const };
  return { label: fmtDate(date), tone: "muted" as const };
}

export function fmtTimestamp(sec: number | null | undefined) {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function detectPlatform(url: string): "google_meet" | "zoom" | "teams" | "other" {
  if (/meet\.google\.com/i.test(url)) return "google_meet";
  if (/zoom\.us/i.test(url)) return "zoom";
  if (/teams\.(microsoft|live)\.com/i.test(url)) return "teams";
  return "other";
}

export const PLATFORM_LABEL: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  other: "Other",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
