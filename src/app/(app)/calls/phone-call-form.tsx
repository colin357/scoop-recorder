"use client";

import { useActionState } from "react";
import { startPhoneCallAction } from "@/app/actions/phone";
import { Icon } from "@/components/icons";
import { formatPhone } from "@/lib/phone-format";
import { ProjectOptions } from "@/components/project-options";
import PhoneVerify from "@/components/phone-verify";

type Project = { id: string; name: string };

/** "Call with Rocky" dialer: just the number up front; title and project tucked away. */
export default function PhoneCallForm({ myPhone, rockyNumber, projects }: { myPhone: string | null; rockyNumber: string | null; projects: Project[] }) {
  const [state, action, pending] = useActionState(startPhoneCallAction, {});

  // Verify right here; once it's done the page refreshes into the dialer.
  if (!myPhone) {
    return (
      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 shrink-0 rounded-full bg-flame-soft text-flame-deep flex items-center justify-center"><Icon name="phone" size={18} /></span>
          <h2 className="font-semibold">First, add your mobile</h2>
        </div>
        <PhoneVerify intro={<>Rocky rings this phone to start each call, and the people you call see it as the caller ID. We&apos;ll call it once with a code to confirm it&apos;s yours.</>} />
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <form action={action} className="card p-5 space-y-3">
        <input name="contactPhone" type="tel" inputMode="tel" autoComplete="off" placeholder="Phone number" aria-label="Phone number to call" required className="!text-lg !py-3" />
        <input name="contactName" placeholder="Name (optional)" aria-label="Who you're calling" />
        <details className="group">
          <summary className="cursor-pointer list-none text-xs text-muted hover:text-ink inline-flex items-center gap-1">
            <Icon name="chevron" size={12} className="-rotate-90 group-open:rotate-0 transition" />More options
          </summary>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <input name="title" placeholder="Title" aria-label="Title" />
            <select name="projectId" defaultValue="" aria-label="Project">
              <option value="">Project: let the AI pick</option>
              <ProjectOptions projects={projects} />
            </select>
          </div>
        </details>
        {state.error && <p className="text-sm text-clay">{state.error}</p>}
        <button className="btn-accent w-full sm:w-auto !py-3 sm:!py-2" disabled={pending}><Icon name="phone" size={16} />{pending ? "Ringing you…" : "Call with Rocky"}</button>
        <p className="text-xs text-muted">Rocky rings you at {formatPhone(myPhone)} first, then connects the call.</p>
      </form>

      {rockyNumber && (
        <div className="card p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Already on a call?</div>
            <div className="text-xs text-muted">Add Rocky, then tap Merge.</div>
          </div>
          <a href={`tel:${rockyNumber}`} className="btn-secondary shrink-0"><Icon name="phone" size={14} />{formatPhone(rockyNumber)}</a>
        </div>
      )}
    </div>
  );
}
