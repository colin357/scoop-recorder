"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startPhoneCallAction } from "@/app/actions/phone";
import { Icon } from "@/components/icons";
import { formatPhone } from "@/lib/phone-format";

type Project = { id: string; name: string };

/** "Call with Rocky": Rocky rings you, then the contact, and records both sides. */
export default function PhoneCallForm({ myPhone, rockyNumber, projects }: { myPhone: string | null; rockyNumber: string | null; projects: Project[] }) {
  const [state, action, pending] = useActionState(startPhoneCallAction, {});
  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 shrink-0 rounded-full bg-flame-soft text-flame-deep flex items-center justify-center"><Icon name="phone" size={18} /></span>
        <div>
          <h2 className="font-semibold">Call with Rocky</h2>
          <p className="text-sm text-muted">Record a phone call. Rocky rings you first, then the other person, and announces that the call is recorded.</p>
        </div>
      </div>
      {!myPhone ? (
        <p className="text-sm rounded-md bg-butter-soft border border-copper text-copper-deep p-3">
          Verify your mobile number first so Rocky knows which phone to ring. <Link href="/settings/profile" className="underline font-medium">Go to your profile</Link>
        </p>
      ) : (
        <form action={action} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label>Who are you calling?</label><input name="contactName" placeholder="Jordan at Acme" /></div>
            <div><label>Their number</label><input name="contactPhone" type="tel" inputMode="tel" placeholder="(239) 555-0123" required /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label>Title (optional)</label><input name="title" placeholder="Call with Jordan" /></div>
            <div>
              <label>Project (optional)</label>
              <select name="projectId" defaultValue="">
                <option value="">Let the AI pick</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted">Rocky calls <b>{formatPhone(myPhone)}</b>. Answer and press any key, and Rocky dials them showing your number. Calls Rocky places count double toward your recording hours, since they use two phone lines.</p>
          {state.error && <p className="text-sm text-clay">{state.error}</p>}
          <button className="btn-primary" disabled={pending}><Icon name="phone" size={16} />{pending ? "Calling you…" : "Call me now"}</button>
        </form>
      )}
      {rockyNumber && myPhone && (
        <p className="text-xs text-muted border-t edge pt-3">Already on a call? Tap Add call, dial Rocky at <b>{formatPhone(rockyNumber)}</b>, then Merge.</p>
      )}
    </section>
  );
}
