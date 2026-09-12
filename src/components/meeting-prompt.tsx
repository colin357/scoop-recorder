"use client";

import { useEffect, useState, useTransition } from "react";
import { decideEventAction } from "@/app/actions/calendar";
import { Mascot } from "@/components/mascot";

type Ev = { id: string; title: string; startAt: string; platform: string };

/** Pop-up asking whether to record a meeting that starts soon. Polls once a minute. */
export default function MeetingPrompt() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/calendar/upcoming", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { events: Ev[] };
        if (alive) setEvents(j.events);
      } catch {}
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const ev = events.find((e) => !dismissed.has(e.id));
  if (!ev) return null;
  const mins = Math.round((new Date(ev.startAt).getTime() - Date.now()) / 60000);
  const decide = (decision: "record" | "skip") =>
    start(async () => {
      setDismissed((d) => new Set(d).add(ev.id));
      await decideEventAction(ev.id, decision);
    });

  return (
    <div className="fixed bottom-20 md:bottom-5 right-5 z-50 w-80 card bg-paper p-4 animate-[pop_.3s_ease-out]">
      <div className="flex gap-3">
        <Mascot pose="wave" size={48} />
        <div className="flex-1 min-w-0">
          <div className="eyebrow">{mins <= 0 ? "Starting now" : `Starts in ${mins} min`}</div>
          <div className="text-sm text-ink-soft truncate">{ev.title}</div>
          <div className="text-xs text-muted">Want me to record this one? 🐾</div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => decide("record")} className="btn-primary flex-1">Record it</button>
        <button onClick={() => decide("skip")} className="btn-secondary flex-1">Skip</button>
        <button onClick={() => setDismissed((d) => new Set(d).add(ev.id))} className="btn-ghost" aria-label="Later">Later</button>
      </div>
    </div>
  );
}
