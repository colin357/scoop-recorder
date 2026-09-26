"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkPhoneVerificationAction, removePhoneAction, startPhoneVerificationAction } from "@/app/actions/phone";
import { Icon } from "@/components/icons";
import { formatPhone } from "@/lib/phone-format";

/**
 * Verify the user's mobile with Twilio: we show a code, Twilio rings the phone,
 * the user types the code. Once verified it is used to ring them for
 * "Call with Rocky", shown as their caller ID, and to recognise merge-in calls.
 */
export default function PhoneSection({ phone, verified, rockyNumber }: { phone: string | null; verified: boolean; rockyNumber: string | null }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // While a code is on screen, check every few seconds whether it was entered.
  useEffect(() => {
    if (!code) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      const r = await checkPhoneVerificationAction().catch(() => ({ verified: false } as { verified?: boolean; error?: string }));
      if (r.verified) { clearInterval(t); setCode(null); router.refresh(); }
      else if (r.error) { clearInterval(t); setCode(null); setError(r.error); }
      else if (tries > 45) { clearInterval(t); setCode(null); setError("We didn't see the code come through. Try again."); }
    }, 4000);
    return () => clearInterval(t);
  }, [code, router]);

  const begin = () => start(async () => {
    setError(null);
    const r = await startPhoneVerificationAction(input);
    if (r.error) setError(r.error);
    else if (r.verified) router.refresh();
    else if (r.code) setCode(r.code);
  });

  return (
    <section className="card p-5 space-y-3">
      <div className="flex items-center gap-2"><Icon name="phone" size={18} /><h2 className="font-semibold">Your phone</h2></div>
      {verified && phone ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{formatPhone(phone)} <span className="badge bg-grass-soft text-grass ml-1">Verified</span></div>
              <p className="text-xs text-muted mt-0.5">Rocky rings this number for &ldquo;Call with Rocky&rdquo;, and people you call see it as the caller ID.</p>
            </div>
            <form action={removePhoneAction}><button className="btn-ghost text-xs">Remove</button></form>
          </div>
          {rockyNumber && (
            <div className="rounded-lg bg-paper-2 p-3 text-sm">
              <div className="font-medium">Already on a call?</div>
              <p className="text-ink-soft mt-0.5">Tap <b>Add call</b>, dial Rocky at <b>{formatPhone(rockyNumber)}</b>, then tap <b>Merge</b>. Rocky announces the recording and joins. Save the number as a contact so it&apos;s one tap away.</p>
            </div>
          )}
        </>
      ) : code ? (
        <div className="rounded-lg bg-butter-soft p-4 text-center space-y-2">
          <p className="text-sm text-ink-soft">Twilio is calling your phone now. When it asks, type this code:</p>
          <div className="font-display text-4xl font-semibold tracking-[0.3em] text-ink">{code}</div>
          <p className="text-xs text-muted">This page updates once the code is accepted.</p>
          <button type="button" className="btn-ghost text-xs" onClick={() => setCode(null)}>Cancel</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">Add your mobile to record phone calls. We&apos;ll call it once with a code to confirm it&apos;s yours.</p>
          <div className="flex flex-wrap gap-2">
            <input className="flex-1 min-w-48" type="tel" inputMode="tel" autoComplete="tel" placeholder="(239) 555-0123" value={input} onChange={(e) => setInput(e.target.value)} />
            <button type="button" className="btn-primary" disabled={pending || !input.trim()} onClick={begin}>{pending ? "Calling…" : "Verify by phone call"}</button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
    </section>
  );
}
