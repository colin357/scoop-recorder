"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

/** Copies the current page URL (or a given one) to the clipboard. */
export default function CopyLink({ url, label = "Copy link", className = "btn-secondary" }: { url?: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url ?? window.location.href.split("?")[0]);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      <Icon name={done ? "check" : "link"} size={16} className={done ? "text-grass" : ""} />
      {done ? "Copied" : label}
    </button>
  );
}
