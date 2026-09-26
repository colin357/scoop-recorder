"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startPhoneCallAction } from "@/app/actions/phone";
import { Icon } from "@/components/icons";
import { formatPhone } from "@/lib/phone-format";

type Project = { id: string; name: string };

/** "Call with Rocky" dialer: just the number up front; title and project tucked away. */
export default function PhoneCallForm({ myPhone, rockyNumber, projects }: { myPhone: string | null; rockyNumber: string | null; projects: Project[] }) {
  const [state, action, pending] = useActionState(startPhoneCallAction, {});

  if (!myPhone) {
    return (
      <section className="card p-5 flex flex-wrap items-center gap-4">
        <span className="h-10 w-10 shrink-0 rounded-full bg-flame-soft text-flame-deep flex items-center justify-center"><Icon name="phone" size={18} /></span>
        <p className="flex-1 min-w-48 text-sm text-ink-soft">Add your mobile so Rocky knows which phone to ring.</p>
        <Link href="/settings/profile" className="btn-primary">Verify your phone</Link>
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
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
