"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";

/**
 * Flash feedback after server actions. Actions redirect back with
 * `?toast=Saved` (and optionally `&tone=error`); this reads it, shows a pill
 * for a few seconds, and scrubs the query from the URL.
 */
function ToastInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  useEffect(() => {
    const text = params.get("toast");
    if (!text) return;
    const tone = params.get("tone") === "error" ? "error" : "ok";
    // Defer the state update out of the effect body; the URL is scrubbed right away.
    const show = setTimeout(() => setMsg({ text, tone }), 0);
    const rest = new URLSearchParams(params.toString());
    rest.delete("toast");
    rest.delete("tone");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
    return () => clearTimeout(show);
  }, [params, pathname, router]);

  useEffect(() => {
    if (!msg) return;
    const hide = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(hide);
  }, [msg]);

  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] toast-in">
      <div className={`flex items-center gap-2 rounded-full pl-2.5 pr-4 py-2 text-sm font-medium shadow-lift ring-1 ${msg.tone === "error" ? "bg-clay text-paper ring-clay" : "bg-ink text-paper ring-white/10"}`}>
        <span className={`h-5 w-5 rounded-full flex items-center justify-center ${msg.tone === "error" ? "bg-white/20" : "bg-grass"}`}><Icon name={msg.tone === "error" ? "close" : "check"} size={12} /></span>
        {msg.text}
      </div>
    </div>
  );
}

export default function Toast() {
  return <Suspense fallback={null}><ToastInner /></Suspense>;
}
