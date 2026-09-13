"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { addDays, format, isSameDay, isToday, parse } from "date-fns";
import { decideEventAction } from "@/app/actions/calendar";
import { StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { WeekItem } from "@/lib/week";

const HOUR_PX = 44;
const MIN_HOUR = 7;
const MAX_HOUR = 20;

function tone(item: WeekItem) {
  if (item.meeting) {
    const s = item.meeting.status;
    if (s === "recording") return "bg-copper text-paper ring-copper";
    if (s === "done") return "bg-grass-soft text-grass ring-grass/30";
    if (s === "failed") return "bg-clay-soft text-clay ring-clay/30";
    return "bg-ink text-paper ring-ink";
  }
  if (item.decision === "record") return "bg-ink text-paper ring-ink";
  if (item.decision === "skip") return "bg-paper-2 text-muted ring-line line-through";
  return "bg-butter-soft text-copper-deep ring-copper/40";
}

function label(item: WeekItem) {
  if (item.meeting) return null;
  if (item.decision === "record") return "Will record";
  if (item.decision === "skip") return "Skipped";
  return "Needs decision";
}

/**
 * Week view: seven day columns on a time grid. Calendar events with a video link
 * show their record/skip state; recorded meetings link to their page. Rendered
 * after mount so times use the viewer's timezone.
 */
export default function WeekCalendar({ weekStart, prev, next, items, baseHref, compact = false }: {
  weekStart: string; prev: string; next: string; items: WeekItem[]; baseHref: string; compact?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);
  const [rows, setRows] = useOptimistic(items, (state, patch: { id: string; decision: string }) => state.map((e) => (e.id === patch.id ? { ...e, decision: patch.decision } : e)));
  const [, start] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const decide = (id: string, decision: "record" | "skip") => start(async () => { setRows({ id, decision }); await decideEventAction(id, decision); });

  const monday = useMemo(() => parse(weekStart, "yyyy-MM-dd", new Date()), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);

  // Expand the visible hours if something falls outside the default window.
  const [minH, maxH] = useMemo(() => {
    let lo = MIN_HOUR, hi = MAX_HOUR;
    for (const it of rows) { const s = new Date(it.startAt), e = new Date(it.endAt); lo = Math.min(lo, s.getHours()); hi = Math.max(hi, e.getHours() + (e.getMinutes() > 0 ? 1 : 0)); }
    return [Math.max(0, lo), Math.min(24, hi)];
  }, [rows]);
  const hours = Array.from({ length: maxH - minH }, (_, i) => minH + i);
  const gridH = hours.length * HOUR_PX;

  const isThisWeek = days.some((d) => isToday(d));
  const weekLabel = `${format(days[0], "MMM d")} – ${format(days[6], days[0].getMonth() === days[6].getMonth() ? "d" : "MMM d")}`;
  const inWeek = (r: WeekItem) => { const d = new Date(r.startAt); return d >= days[0] && d < addDays(days[6], 1); };
  const undecided = mounted ? rows.filter((r) => r.kind === "event" && !r.meeting && r.decision === "undecided" && inWeek(r)).length : 0;
  const sel = rows.find((r) => r.id === selected) ?? null;

  const nowTop = (() => { const n = new Date(); const h = n.getHours() + n.getMinutes() / 60; return h < minH || h > maxH ? null : (h - minH) * HOUR_PX; })();

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b edge">
        <div className="flex items-center gap-2">
          <Link href={`${baseHref}?week=${prev}`} className="btn-ghost !px-2" aria-label="Previous week"><Icon name="chevron" size={16} className="rotate-90" /></Link>
          <Link href={`${baseHref}?week=${next}`} className="btn-ghost !px-2" aria-label="Next week"><Icon name="chevron" size={16} className="-rotate-90" /></Link>
          <span className="font-semibold">{mounted ? weekLabel : " "}</span>
          {!isThisWeek && mounted && <Link href={baseHref} className="text-xs text-muted hover:text-ink underline">Today</Link>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          {undecided > 0 && <span className="badge bg-butter-soft text-copper-deep">{undecided} need{undecided === 1 ? "s" : ""} a decision</span>}
          <span className="hidden sm:inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" />Recording</span>
          <span className="hidden sm:inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-copper" />Undecided</span>
          <span className="hidden sm:inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-grass" />Done</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* day headers */}
          <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b edge">
            <div />
            {days.map((d) => {
              const today = mounted && isToday(d);
              return (
                <div key={d.toISOString()} className={`px-2 py-2 text-center border-l edge ${today ? "bg-paper-2" : ""}`}>
                  <div className="text-[11px] uppercase tracking-wide text-muted">{format(d, "EEE")}</div>
                  <div className={`mx-auto mt-0.5 h-7 w-7 rounded-full inline-flex items-center justify-center text-sm font-display font-semibold ${today ? "bg-copper text-paper" : ""}`}>{format(d, "d")}</div>
                </div>
              );
            })}
          </div>

          {/* time grid */}
          <div className="grid grid-cols-[52px_repeat(7,1fr)] relative" style={{ height: compact ? Math.min(gridH, 9 * HOUR_PX) : gridH, overflowY: compact ? "auto" : undefined }}>
            <div className="relative" style={{ height: gridH }}>
              {hours.slice(1).map((h) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted" style={{ top: (h - minH) * HOUR_PX }}>{format(new Date(2000, 0, 1, h), "h a")}</div>
              ))}
            </div>
            {days.map((d) => {
              const today = mounted && isToday(d);
              const dayItems = mounted ? rows.filter((r) => isSameDay(new Date(r.startAt), d)) : [];
              return (
                <div key={d.toISOString()} className={`relative border-l edge ${today ? "bg-paper-2/60" : ""}`} style={{ height: gridH }}>
                  {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-line/50" style={{ top: (h - minH) * HOUR_PX }} />)}
                  {today && nowTop != null && <div className="absolute inset-x-0 z-10 border-t-2 border-copper" style={{ top: nowTop }}><span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-copper" /></div>}
                  {dayItems.map((it) => {
                    const s = new Date(it.startAt), e = new Date(it.endAt);
                    const top = (s.getHours() + s.getMinutes() / 60 - minH) * HOUR_PX;
                    const height = Math.max(22, ((e.getTime() - s.getTime()) / 3600000) * HOUR_PX - 2);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => setSelected(selected === it.id ? null : it.id)}
                        className={`absolute left-1 right-1 rounded-lg px-1.5 py-1 text-left text-[11px] leading-tight ring-1 shadow-soft transition hover:shadow-lift ${tone(it)} ${selected === it.id ? "z-20 ring-2" : "z-[5]"}`}
                        style={{ top, height }}
                        title={`${it.title} · ${format(s, "h:mm a")}`}
                      >
                        <div className="font-semibold truncate">{it.title}</div>
                        {height > 34 && <div className="opacity-80 truncate">{format(s, "h:mm")}–{format(e, "h:mm a")}</div>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sel && (
        <div className="border-t edge px-4 py-3 flex flex-wrap items-center gap-3 bg-paper-2/50">
          <div className="flex-1 min-w-52">
            <div className="font-medium text-sm">{sel.title}</div>
            <div className="text-xs text-muted">{format(new Date(sel.startAt), "EEE, MMM d · h:mm a")} – {format(new Date(sel.endAt), "h:mm a")} · {sel.platform}</div>
          </div>
          {sel.meeting ? (
            <Link href={`/meetings/${sel.meeting.id}`} className="inline-flex items-center gap-2"><StatusBadge status={sel.meeting.status} /><span className="btn-secondary !py-1 text-xs">Open meeting</span></Link>
          ) : (
            <>
              <span className={`badge ${sel.decision === "record" ? "bg-grass-soft text-grass" : sel.decision === "skip" ? "bg-paper-2 text-ink-soft" : "bg-butter-soft text-copper-deep"}`}>{label(sel)}</span>
              <div className="flex gap-1">
                {sel.decision !== "record" && <button onClick={() => decide(sel.id, "record")} className="btn-primary !py-1 text-xs">Record</button>}
                {sel.decision !== "skip" && <button onClick={() => decide(sel.id, "skip")} className="btn-secondary !py-1 text-xs">Skip</button>}
              </div>
            </>
          )}
          <button onClick={() => setSelected(null)} className="btn-ghost !px-2 !py-1" aria-label="Close"><Icon name="close" size={14} /></button>
        </div>
      )}
    </div>
  );
}
