import { cache } from "react";

/**
 * Viewer time zone for server rendering. The browser reports its IANA zone in
 * the `scoop.tz` cookie (see TimezoneSync); the app layout stores it per
 * request here and the date helpers format with it. In the browser the store
 * is inert and the helpers fall back to the local clock, which is the same
 * zone, so server and client agree.
 */
export const TZ_COOKIE = "scoop.tz";

const store = cache(() => ({ tz: null as string | null }));

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

export function setRequestTimeZone(tz: string | null | undefined) {
  store().tz = isValidTimeZone(tz) ? tz : null;
}

/** The viewer's zone on the server, or null (use the local clock). */
export function requestTimeZone(): string | null {
  return typeof window === "undefined" ? store().tz : null;
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsIn(d: Date, tz: string): Parts {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(d);
  const g = (t: Intl.DateTimeFormatPartTypes) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { year: g("year"), month: g("month"), day: g("day"), hour: g("hour") % 24, minute: g("minute"), second: g("second") };
}

/** Offset of `tz` from UTC at instant `d`, in ms (positive east of UTC). */
export function tzOffsetMs(d: Date, tz: string) {
  const p = partsIn(d, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000;
}

/** Calendar date of `d` in `tz`, as yyyy-MM-dd. */
export function dayKey(d: Date, tz: string | null) {
  if (!tz) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const p = partsIn(d, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Midnight at the start of the calendar day containing `d`, in `tz`. */
export function startOfDayIn(d: Date, tz: string | null) {
  if (!tz) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  const p = partsIn(d, tz);
  const guess = Date.UTC(p.year, p.month - 1, p.day);
  const t = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(t), tz));
}

/** Last millisecond of the calendar day containing `d`, in `tz`. */
export function endOfDayIn(d: Date, tz: string | null) {
  const start = startOfDayIn(d, tz);
  const next = startOfDayIn(new Date(start.getTime() + 36 * 3600 * 1000), tz);
  return new Date(next.getTime() - 1);
}
