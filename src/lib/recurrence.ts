import { addDays, addMonths, addWeeks } from "date-fns";

export const RECURRENCES = [
  { key: "daily", label: "Daily", short: "daily" },
  { key: "weekly", label: "Weekly", short: "weekly" },
  { key: "biweekly", label: "Every 2 weeks", short: "every 2 weeks" },
  { key: "monthly", label: "Monthly", short: "monthly" },
] as const;
export type Recurrence = (typeof RECURRENCES)[number]["key"];

export function isRecurrence(v: unknown): v is Recurrence {
  return RECURRENCES.some((r) => r.key === v);
}

export function recurrenceLabel(key: string | null | undefined) {
  return RECURRENCES.find((r) => r.key === key)?.short ?? null;
}

/** Next due date after `from` for a recurrence. Monthly keeps the day of month where possible. */
export function nextOccurrence(from: Date, recurrence: Recurrence) {
  switch (recurrence) {
    case "daily": return addDays(from, 1);
    case "weekly": return addWeeks(from, 1);
    case "biweekly": return addWeeks(from, 2);
    case "monthly": return addMonths(from, 1);
  }
}
