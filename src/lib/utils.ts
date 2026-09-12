import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy h:mm a");
}

export function fmtRelative(d: Date | string | null | undefined) {
  if (!d) return "";
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}

export function dueLabel(d: Date | null | undefined, status?: string) {
  if (!d) return { label: "No due date", tone: "muted" as const };
  const date = new Date(d);
  if (status === "done") return { label: fmtDate(date), tone: "muted" as const };
  if (isToday(date)) return { label: "Due today", tone: "warn" as const };
  if (isTomorrow(date)) return { label: "Due tomorrow", tone: "warn" as const };
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
