"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { decideEventAction } from "@/app/actions/calendar";
import { StatusBadge } from "@/components/ui";

export type UpcomingEvent = {
  id: string; title: string; startAt: string; platform: string; decision: string; when: string;
  meeting: { id: string; status: string } | null;
};

export default function UpcomingList({ events }: { events: UpcomingEvent[] }) {
  const [rows, setRows] = useOptimistic(events, (state, patch: { id: string; decision: string }) =>
    state.map((e) => (e.id === patch.id ? { ...e, decision: patch.decision } : e)),
  );
  const [, start] = useTransition();
  const decide = (id: string, decision: "record" | "skip") =>
    start(async () => { setRows({ id, decision }); await decideEventAction(id, decision); });

  return (
    <ul className="divide-y divide-line/60">
      {rows.map((e) => (
        <li key={e.id} className="py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-48">
            <div className="font-medium text-sm">{e.title}</div>
            <div className="text-xs text-muted">{e.when} · {e.platform}</div>
          </div>
          {e.meeting ? (
            <Link href={`/meetings/${e.meeting.id}`}><StatusBadge status={e.meeting.status} /></Link>
          ) : e.decision === "record" ? (
            <span className="badge bg-grass-soft text-grass">Will record</span>
          ) : e.decision === "skip" ? (
            <span className="badge bg-paper-2 text-ink-soft">Skipped</span>
          ) : (
            <span className="badge bg-butter-soft text-copper-deep">Needs decision</span>
          )}
          <div className="flex gap-1">
            {e.decision !== "record" && <button onClick={() => decide(e.id, "record")} className="btn-primary !py-1 text-xs">Record</button>}
            {e.decision !== "skip" && <button onClick={() => decide(e.id, "skip")} className="btn-secondary !py-1 text-xs">Skip</button>}
          </div>
        </li>
      ))}
    </ul>
  );
}
