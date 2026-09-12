"use client";

import { useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/recall";
import { fmtTimestamp } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";

export default function RecordingPlayer({ url, startAt, transcript }: { url: string | null; startAt: number; transcript: TranscriptSegment[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(startAt);
  const isMedia = url ? /\.(mp4|webm|m4v|mov)(\?|$)/i.test(url) : false;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const seek = () => { v.currentTime = startAt; if (startAt > 0) v.play().catch(() => {}); };
    if (v.readyState >= 1) seek(); else v.addEventListener("loadedmetadata", seek, { once: true });
  }, [startAt, url]);

  const jump = (sec: number) => {
    setCurrent(sec);
    const v = videoRef.current;
    if (v) { v.currentTime = sec; v.play().catch(() => {}); }
  };

  const activeIdx = transcript.findIndex((s, i) => current >= s.startSec && (i === transcript.length - 1 || current < transcript[i + 1].startSec));

  return (
    <div className="card overflow-hidden">
      {url && isMedia ? (
        <video ref={videoRef} src={url} controls className="w-full bg-black aspect-video" onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)} />
      ) : url ? (
        <div className="p-4 bg-ink text-paper text-sm flex items-center justify-between">
          <span>Recording hosted externally.</span>
          <a href={url} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5">Open recording{startAt ? ` (${fmtTimestamp(startAt)})` : ""}</a>
        </div>
      ) : (
        <div className="px-4 py-3 bg-paper-2 border-b edge text-sm text-muted flex items-center gap-2"><Icon name="video" size={16} />{transcript.length ? "Transcript only. No recording for this meeting." : "No recording yet."}</div>
      )}
      {transcript.length > 0 && (
        <div className="max-h-80 overflow-y-auto divide-y divide-line/60">
          {transcript.map((s, i) => (
            <button
              key={i}
              id={`seg-${i}`}
              onClick={() => jump(s.startSec)}
              className={`w-full text-left px-4 py-2.5 text-sm flex gap-3 transition hover:bg-paper-2 ${i === activeIdx ? "bg-butter-soft" : ""}`}
            >
              <span className="text-[11px] text-muted font-mono w-10 shrink-0 pt-1">{fmtTimestamp(s.startSec)}</span>
              <Avatar name={s.speaker} size="sm" className="mt-0.5" />
              <span className="min-w-0"><span className="font-semibold text-ink block text-xs mb-0.5">{s.speaker}</span><span className="text-ink-soft">{s.text}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
