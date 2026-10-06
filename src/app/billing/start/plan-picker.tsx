"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startCheckoutAction } from "@/app/actions/billing";
import { track } from "@/components/analytics";

const usd = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString("en-US")}` : `$${n.toFixed(2)}`);

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full" disabled={pending}>{pending ? "Opening checkout…" : label}</button>;
}

/** One plan: pick monthly or annual and see the total before going to Stripe. */
export default function PlanPicker({ seats, invited = 0, monthly, annual, cta, footnote }: { seats: number; invited?: number; monthly: number; annual: number; cta: string; footnote?: string }) {
  const [interval, pickInterval] = useState<"month" | "year">("year");
  const per = interval === "year" ? annual : monthly;
  const who = seats === 1 && invited > 0 ? "you" : `${seats} ${seats === 1 ? "person" : "people"}`;

  return (
    <form action={startCheckoutAction} onSubmit={() => track("checkout_opened", { interval, people: seats })} className="card p-6 text-center">
      <input type="hidden" name="interval" value={interval} />
      <div role="radiogroup" aria-label="Billing" className="inline-grid grid-cols-2 gap-1 rounded-full bg-paper-2 p-1 text-sm">
        {(
          [
            ["year", "Yearly", "-20%"],
            ["month", "Monthly", null],
          ] as const
        ).map(([key, label, tag]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={interval === key}
            onClick={() => pickInterval(key)}
            className={`rounded-full px-4 py-1.5 font-medium transition ${interval === key ? "bg-paper shadow-soft text-ink" : "text-muted hover:text-ink"}`}
          >
            {label}
            {tag && <span className="ml-1 text-xs font-semibold text-grass">{tag}</span>}
          </button>
        ))}
      </div>

      <div className="mt-5 font-display font-bold text-5xl tracking-tight">{usd(per)}</div>
      <div className="text-sm text-muted mt-1">per person / month</div>
      <p className="text-sm text-ink-soft mt-4" data-testid="plan-total">
        {usd(seats * per)}/mo for {who}
        {invited > 0 && `, plus ${usd(per)} per teammate who joins`}
      </p>

      <div className="mt-5"><Submit label={cta} /></div>
      {footnote && <p className="text-xs text-muted mt-3">{footnote}</p>}
    </form>
  );
}
