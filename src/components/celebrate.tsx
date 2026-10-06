"use client";

import { useMemo } from "react";

/**
 * One-off celebration overlays. Render with a new `burstKey` to replay;
 * pieces remove themselves visually after the animation (the parent clears
 * the burst a moment later). Nothing renders for reduced motion (CSS).
 */
const COLORS = ["#f15025", "#f6b73c", "#1f8a4c", "#2f7cf6", "#e8743b", "#8b5cf6", "#ec4899"];

// Deterministic "random" so renders are stable for a given burst.
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function Confetti({ burstKey, pieces = 90 }: { burstKey: number; pieces?: number }) {
  const bits = useMemo(() => {
    const r = rng(burstKey * 7919 + 13);
    return Array.from({ length: pieces }, (_, i) => ({
      left: r() * 100,
      color: COLORS[i % COLORS.length],
      w: 6 + r() * 6,
      h: 8 + r() * 10,
      delay: r() * 0.35,
      dur: 1.6 + r() * 1.2,
      drift: (r() - 0.5) * 220,
      spin: (r() > 0.5 ? 1 : -1) * (360 + r() * 720),
      round: r() > 0.75,
    }));
  }, [burstKey, pieces]);
  return (
    <div className="celebrate-layer" aria-hidden key={burstKey}>
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{
            left: `${b.left}%`, width: b.w, height: b.round ? b.w : b.h, background: b.color, borderRadius: b.round ? "50%" : 2,
            animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`,
            ["--drift" as string]: `${b.drift}px`, ["--spin" as string]: `${b.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

/** A handful of paw prints that float up from the bottom of the screen. */
export function PawBurst({ burstKey }: { burstKey: number }) {
  const paws = useMemo(() => {
    const r = rng(burstKey * 104729 + 7);
    return Array.from({ length: 14 }, () => ({ left: 5 + r() * 90, delay: r() * 0.5, dur: 1.4 + r() * 0.8, size: 18 + r() * 18, tilt: (r() - 0.5) * 50 }));
  }, [burstKey]);
  return (
    <div className="celebrate-layer" aria-hidden key={burstKey}>
      {paws.map((p, i) => (
        <span key={i} className="paw-bit" style={{ left: `${p.left}%`, fontSize: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ["--tilt" as string]: `${p.tilt}deg` }}>🐾</span>
      ))}
    </div>
  );
}
