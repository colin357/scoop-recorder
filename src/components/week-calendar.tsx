"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { addDays, format, isSameDay, isToday, parse } from "date-fns";
import { decideEventAction } from "@/app/actions/calendar";
import { StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { WeekItem } from "@/lib/week";

const HOUR_PX = 56;
const MIN_HOUR = 7;
const MAX_HOUR = 20;

function tone(item: WeekItem) {
  if (item.meeting) {
    const s = item.meeting.status;
    if (s === "recording") return "bg-flame text-white border-flame-deep";
    if (s === "done") return "bg-grass-soft text-grass border-grass";
    if (s === "failed") return "bg-clay-soft text-clay border-clay";
    return "bg-paper text-ink border-ink";
  }
  if (item.decision === "record") return "bg-paper text-ink border-ink";
  if (item.decision === "skip") return "bg-paper-2 text-muted border-line line-through";
  return "bg-butter-soft text-copper-deep border-flame";
}

/**
 * Side-by-side columns for meetings that overlap in time. Events are grouped
 * into clusters that share a stretch of time, each event takes the first free
 * column, and the cluster's column count sets the width.
 */
function layout(items: WeekItem[]) {
  const sorted = [...items].sort((a, b) => a.startAt.localeCompare(b.startAt) || b.endAt.localeCompare(a.endAt));
  const out = new Map<string, { col: number; cols: number }>();
  let cluster: { id: string; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => { for (const c of cluster) out.set(c.id, { col: c.col, cols: colEnds.length }); cluster = []; colEnds = []; };
  for (const it of sorted) {
    const s = new Date(it.startAt).getTime(), e = Math.max(new Date(it.endAt).getTime(), s + 15 * 60000);
    if (s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= s);
    if (col === -1) { col = colEnds.length; colEnds.push(e); } else colEnds[col] = e;
    cluster.push({ id: it.id, col });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
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
          <span className="hidden sm:inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l-[3px] border-ink bg-paper ring-1 ring-line" />Will record</span>
          <span className="hidden sm:inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l-[3px] border-flame bg-butter-soft ring-1 ring-line" />Undecided</span>
          <span className="hidden sm:inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-l-[3px] border-grass bg-grass-soft ring-1 ring-line" />Done</span>
          <span className="hidden sm:inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-paper-2 ring-1 ring-line" />Skipped</span>
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
          <div className="grid grid-cols-[52px_repeat(7,1fr)] relative" style={{ height: compact ? Math.min(gridH, 8 * HOUR_PX) : gridH, overflowY: compact ? "auto" : undefined }}>
            <div className="relative" style={{ height: gridH }}>
              {hours.slice(1).map((h) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted" style={{ top: (h - minH) * HOUR_PX }}>{format(new Date(2000, 0, 1, h), "h a")}</div>
              ))}
            </div>
            {days.map((d) => {
              const today = mounted && isToday(d);
              const dayItems = mounted ? rows.filter((r) => isSameDay(new Date(r.startAt), d)) : [];
              const pos = layout(dayItems);
              return (
                <div key={d.toISOString()} className={`relative border-l edge ${today ? "bg-paper-2/60" : ""}`} style={{ height: gridH }}>
                  {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-line/50" style={{ top: (h - minH) * HOUR_PX }} />)}
                  {hours.map((h) => <div key={`${h}h`} className="absolute inset-x-0 border-t border-dashed border-line/30" style={{ top: (h - minH + 0.5) * HOUR_PX }} />)}
                  {today && nowTop != null && <div className="absolute inset-x-0 z-10 border-t-2 border-flame" style={{ top: nowTop }}><span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-flame" /></div>}
                  {dayItems.map((it) => {
                    const s = new Date(it.startAt), e = new Date(it.endAt);
                    const top = (s.getHours() + s.getMinutes() / 60 - minH) * HOUR_PX + 1;
                    const height = Math.max(24, ((e.getTime() - s.getTime()) / 3600000) * HOUR_PX - 3);
                    const { col, cols } = pos.get(it.id) ?? { col: 0, cols: 1 };
                    const width = 100 / cols;
                    const active = selected === it.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => setSelected(active ? null : it.id)}
                        className={`absolute rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-soft ring-1 ring-line/70 transition hover:shadow-lift hover:z-20 ${tone(it)} ${active ? "z-20 ring-2 ring-ink" : "z-[5]"}`}
                        style={{ top, height, left: `calc(${col * width}% + 3px)`, width: `calc(${width}% - ${cols > 1 ? 4 : 6}px)` }}
                        title={`${it.title} · ${format(s, "h:mm a")}–${format(e, "h:mm a")}`}
                      >
                        <div className="font-semibold truncate">{it.title}</div>
                        {height > 36 && <div className="opacity-70 truncate">{format(s, "h:mm")}–{format(e, "h:mm a")}</div>}
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
