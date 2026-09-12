"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LIVE = ["scheduled", "joining", "recording", "processing"];

/** While a meeting is in flight, poll its status and refresh the page when it changes. */
export default function LiveStatus({ meetingId, status }: { meetingId: string; status: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!LIVE.includes(status)) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { status: string };
        if (j.status !== status) router.refresh();
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [meetingId, status, router]);
  if (!LIVE.includes(status)) return null;
  const label = { scheduled: "Recorder scheduled", joining: "Joining the call", recording: "Recording", processing: "Writing up" }[status];
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-clay bg-clay-soft border border-clay rounded-full px-2.5 py-1">
      <span className={`h-2 w-2 rounded-full bg-clay ${status === "recording" ? "animate-pulse" : ""}`} />{label}
    </span>
  );
}
