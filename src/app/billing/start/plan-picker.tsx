"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startCheckoutAction } from "@/app/actions/billing";

const usd = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString("en-US")}` : `$${n.toFixed(2)}`);

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full" disabled={pending}>{pending ? "Opening checkout…" : label}</button>;
}

/** One plan: pick monthly or annual and see the total for the team before going to Stripe. */
export default function PlanPicker({ seats, monthly, annual, cta }: { seats: number; monthly: number; annual: number; cta: string }) {
  const [interval, pickInterval] = useState<"month" | "year">("year");
  const per = interval === "year" ? annual : monthly;
  const people = `${seats} ${seats === 1 ? "person" : "people"}`;

  return (
    <form action={startCheckoutAction} className="card p-5 space-y-4">
      <input type="hidden" name="interval" value={interval} />
      <div role="radiogroup" aria-label="Billing" className="grid grid-cols-2 gap-1 rounded-xl bg-paper-2 p-1 text-sm">
        {(
          [
            ["year", "Annual", "save 20%"],
            ["month", "Monthly", null],
          ] as const
        ).map(([key, label, note]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={interval === key}
            onClick={() => pickInterval(key)}
            className={`rounded-lg px-3 py-2 font-medium transition ${interval === key ? "bg-paper shadow-soft text-ink" : "text-muted hover:text-ink"}`}
          >
            {label}
            {note && <span className="ml-1.5 text-xs font-semibold text-grass">{note}</span>}
          </button>
        ))}
      </div>

      <div>
        <div className="text-3xl font-display font-bold">
          {usd(per)}
          <span className="text-base font-medium text-muted"> per person / month</span>
        </div>
        <p className="text-sm text-ink-soft mt-2" data-testid="plan-total">
          {people} × {usd(per)} = <span className="font-semibold text-ink">{usd(seats * per)} a month</span>
          {interval === "year" && <span className="text-muted">, billed {usd(seats * per * 12)} a year</span>}
        </p>
      </div>

      <Submit label={cta} />
    </form>
  );
}
