"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

const W = 320, H = 180;
let inFlight = 0;
const MAX_PARALLEL = 2;
const waiters: (() => void)[] = [];
const acquire = () => new Promise<void>((resolve) => { if (inFlight < MAX_PARALLEL) { inFlight++; resolve(); } else waiters.push(() => { inFlight++; resolve(); }); });
const release = () => { inFlight--; waiters.shift()?.(); };

/**
 * 16:9 thumbnail for a meeting. Shows the stored frame when there is one;
 * otherwise, once scrolled into view, grabs a frame from the recording through
 * the same-origin proxy, stores it, and swaps it in. Meetings without a
 * recording show a placeholder.
 */
export default function MeetingThumb({ id, thumbnail, hasRecording, className = "" }: { id: string; thumbnail: string | null; hasRecording: boolean; className?: string }) {
  const [src, setSrc] = useState<string | null>(thumbnail);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (src || !hasRecording || failed || !ref.current) return;
    let cancelled = false;
    const el = ref.current;
    const capture = async () => {
      await acquire();
      if (cancelled) { release(); return; }
      const video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.preload = "metadata";
      video.src = `/api/meetings/${id}/recording`;
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("timeout")), 25_000);
          video.onerror = () => { clearTimeout(timer); reject(new Error("video error")); };
          video.onloadedmetadata = () => {
            const d = video.duration;
            // Skip the bot's join screen: 15% in, at least 20 s, but inside the video.
            video.currentTime = Number.isFinite(d) && d > 0 ? Math.min(Math.max(d * 0.15, 20), Math.max(d - 1, 0)) : 20;
          };
          video.onseeked = () => {
            try {
              const c = document.createElement("canvas"); c.width = W; c.height = H;
              const ctx = c.getContext("2d")!;
              const vw = video.videoWidth || W, vh = video.videoHeight || H;
              const scale = Math.max(W / vw, H / vh);
              const dw = vw * scale, dh = vh * scale;
              ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
              clearTimeout(timer); resolve(c.toDataURL("image/jpeg", 0.72));
            } catch (e) { clearTimeout(timer); reject(e as Error); }
          };
        });
        if (cancelled) return;
        setSrc(dataUrl);
        await fetch(`/api/meetings/${id}/thumbnail`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        video.removeAttribute("src"); video.load();
        release();
      }
    };
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); capture(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); };
  }, [id, src, hasRecording, failed]);

  return (
    <div ref={ref} className={`relative shrink-0 overflow-hidden rounded-lg bg-paper-2 ring-1 ring-line/60 aspect-video ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center text-muted ${hasRecording && !failed ? "skeleton" : ""}`}><Icon name="video" size={18} /></div>
      )}
      {src && <span className="absolute inset-0 flex items-center justify-center"><span className="h-7 w-7 rounded-full bg-ink/70 text-paper flex items-center justify-center"><Icon name="play" size={12} /></span></span>}
    </div>
  );
}
