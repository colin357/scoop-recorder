"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitSupportRequestAction } from "@/app/actions/support";
import { Icon } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { SUPPORT_CATEGORIES } from "@/lib/support";


/** Floating help button (bottom right) that opens a small support form. */
export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pathname = usePathname();
  const first = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => first.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        const res = await submitSupportRequestAction({ category, subject, message, pageUrl: window.location.href, userAgent: navigator.userAgent });
        if (!res.ok) { setError(res.error); return; }
        setSent(res.id);
        setSubject(""); setMessage("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't send that. Try again?");
      }
    });

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSent(null); }}
        aria-label={open ? "Close support" : "Get help"}
        aria-expanded={open}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 h-12 w-12 rounded-full bg-ink text-paper shadow-lift flex items-center justify-center hover:bg-ink-soft transition"
      >
        <Icon name={open ? "close" : "chat"} size={20} />
      </button>

      {open && (
        <div role="dialog" aria-label="Contact support" className="fixed bottom-[8.75rem] md:bottom-[5.25rem] right-4 md:right-6 z-40 w-[calc(100vw-2rem)] max-w-sm card bg-paper p-4 animate-[pop_.25s_ease-out]">
          {sent ? (
            <div className="flex gap-3 items-start">
              <Mascot pose="celebrate" size={56} />
              <div className="flex-1 text-sm">
                <div className="font-semibold">Got it, thanks!</div>
                <p className="text-ink-soft mt-1">We&apos;ll reply by email, usually within a business day. Your reference is <span className="font-mono text-xs">{sent.slice(-8)}</span>.</p>
                <button className="btn-secondary mt-3" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
              <div className="flex gap-3 items-center">
                <Mascot pose="listen" size={44} />
                <div>
                  <div className="font-semibold text-sm">How can we help?</div>
                  <div className="text-xs text-muted">Bugs, questions, billing, ideas. We read every one.</div>
                </div>
              </div>
              <div>
                <label htmlFor="support-category">Topic</label>
                <select id="support-category" ref={first} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {SUPPORT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="support-subject">Subject</label>
                <input id="support-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="One line" maxLength={200} required />
              </div>
              <div>
                <label htmlFor="support-message">What happened?</label>
                <textarea id="support-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="What you expected, what you got, and any steps to reproduce." maxLength={5000} required />
              </div>
              {error && <p className="text-sm text-clay">{error}</p>}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted truncate">Includes this page ({pathname}) and your browser.</span>
                <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
