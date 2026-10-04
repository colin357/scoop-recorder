"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkPhoneVerificationAction, confirmPhoneCodeAction, startPhoneVerificationAction } from "@/app/actions/phone";
import { formatPhone } from "@/lib/phone-format";

/**
 * Verify the user's mobile by phone call, wherever it's needed (Calls tab,
 * Settings → Profile). Usually Twilio rings and the user types the code we
 * show on the keypad; if Twilio already knows the number, Rocky rings and
 * reads out a code that the user types here. The page refreshes once the
 * number is verified.
 */
export default function PhoneVerify({ intro }: { intro?: React.ReactNode }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [entered, setEntered] = useState("");
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
    else if (r.codeSent) { setEntered(""); setCodeSent(true); }
  });

  const confirm = () => start(async () => {
    setError(null);
    const r = await confirmPhoneCodeAction(entered);
    if (r.verified) { setCodeSent(false); router.refresh(); }
    else { if (r.error) setError(r.error); if (!r.codeSent) setCodeSent(false); }
  });

  return (
    <div className="space-y-3">
      {codeSent ? (
          <form className="rounded-lg bg-butter-soft p-4 text-center space-y-3" onSubmit={(e) => { e.preventDefault(); confirm(); }}>
            <p className="text-sm text-ink-soft">Rocky is calling {formatPhone(input) || "your phone"} now. Type the 6-digit code he reads out.</p>
            <input
              className="mx-auto block w-44 text-center font-display text-2xl tracking-[0.3em]"
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" autoFocus
              value={entered} onChange={(e) => setEntered(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <div className="flex justify-center gap-2">
              <button className="btn-primary" disabled={pending || entered.length !== 6}>{pending ? "Checking…" : "Confirm"}</button>
              <button type="button" className="btn-ghost text-xs" disabled={pending} onClick={begin}>Call me again</button>
              <button type="button" className="btn-ghost text-xs" onClick={() => { setCodeSent(false); setError(null); }}>Cancel</button>
            </div>
          </form>
        ) : code ? (
          <div className="rounded-lg bg-butter-soft p-4 text-center space-y-2">
            <p className="text-sm text-ink-soft">Twilio is calling your phone now. When it asks, type this code:</p>
            <div className="font-display text-4xl font-semibold tracking-[0.3em] text-ink">{code}</div>
            <p className="text-xs text-muted">This page updates once the code is accepted.</p>
            <button type="button" className="btn-ghost text-xs" onClick={() => setCode(null)}>Cancel</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">{intro ?? <>Add your mobile to record phone calls. We&apos;ll call it once with a code to confirm it&apos;s yours.</>}</p>
            <div className="flex flex-wrap gap-2">
              <input className="flex-1 min-w-48" type="tel" inputMode="tel" autoComplete="tel" placeholder="(239) 555-0123" value={input} onChange={(e) => setInput(e.target.value)} />
              <button type="button" className="btn-primary" disabled={pending || !input.trim()} onClick={begin}>{pending ? "Calling…" : "Verify by phone call"}</button>
            </div>
          </>
        )}
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  );
}
