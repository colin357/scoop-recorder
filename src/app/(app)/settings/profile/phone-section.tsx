"use client";

import { removePhoneAction } from "@/app/actions/phone";
import { Icon } from "@/components/icons";
import PhoneVerify from "@/components/phone-verify";
import { formatPhone } from "@/lib/phone-format";

/**
 * The user's verified mobile: used to ring them for "Call with Rocky", shown
 * as their caller ID, and to recognise merge-in calls.
 */
export default function PhoneSection({ phone, verified, rockyNumber }: { phone: string | null; verified: boolean; rockyNumber: string | null }) {
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
      ) : (
        <PhoneVerify />
      )}
    </section>
  );
}
