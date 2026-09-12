"use client";

import { useEffect, useState } from "react";

const CASES = ["Knows who owns what", "Assigns without the follow-up", "Shares the context, not just the task", "No more “who was handling that?”", "Catch up without a recap call"];

/** Cycling use-case chips under the hero, like a rotating prompt list. */
export default function UseCaseChips() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % CASES.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-wrap gap-2">
      {CASES.map((c, j) => (
        <span
          key={c}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-500 ${j === i ? "bg-ink text-paper border-ink shadow-btn" : "bg-paper text-ink-soft edge"}`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
