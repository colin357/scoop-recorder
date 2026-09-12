import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PRICING, billingSnapshot, fmtUsd, planFor, seatPrice, stripeConfigured } from "@/lib/billing";
import { openPortalAction, startPaidPlanNowAction } from "@/app/actions/billing";
import { fmtDate } from "@/lib/utils";

const STATUS: Record<string, { label: string; cls: string }> = {
  trialing: { label: "Free trial", cls: "bg-sky text-merle-deep" },
  active: { label: "Active", cls: "bg-grass-soft text-grass" },
  past_due: { label: "Payment failed", cls: "bg-clay-soft text-clay" },
  canceled: { label: "Cancelled", cls: "bg-paper-2 text-muted" },
  unpaid: { label: "Unpaid", cls: "bg-clay-soft text-clay" },
  comped: { label: "Complimentary", cls: "bg-butter-soft text-copper-deep" },
  none: { label: "No plan", cls: "bg-paper-2 text-muted" },
};

export default async function BillingSettingsPage({ searchParams }: PageProps<"/settings/billing">) {
  const sp = await searchParams;
  const { org } = await requireAdmin();
  const snap = await billingSnapshot(org);
  const st = STATUS[snap.status] ?? STATUS.none;
  const pct = Math.min(100, Math.round((snap.usedHours / Math.max(1, snap.includedHours)) * 100));
  const perSeat = snap.interval ? seatPrice(snap.plan, snap.interval) : null;
  const plan = planFor(snap.plan);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted">Plan, seats and recording usage for {org.name}. Admins only.</p>
      </div>

      {sp.checkout === "success" && <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">You&apos;re all set. Rocky can record now.</p>}
      {sp.upgraded && <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">Your paid plan has started. Thanks!</p>}
      {typeof sp.error === "string" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3">{decodeURIComponent(sp.error)}</p>}
      {!stripeConfigured() && <p className="rounded-md bg-butter-soft border border-copper text-copper-deep text-sm p-3">Billing is not configured on this deployment (STRIPE_SECRET_KEY), so recording is not gated.</p>}

      <section className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Plan</h2>
            <div className="text-sm text-muted mt-0.5">
              {perSeat != null ? <><span className="font-medium text-ink">{snap.planName}</span> · {fmtUsd(perSeat)} per seat per month, billed {snap.interval === "year" ? "annually" : "monthly"} · {snap.seats} seat{snap.seats === 1 ? "" : "s"}</> : snap.status === "comped" ? "Complimentary access" : "No subscription yet"}
            </div>
          </div>
          <span className={`badge ${st.cls}`}>{st.label}</span>
        </div>
        <dl className="grid sm:grid-cols-3 gap-3 text-sm">
          {snap.status === "trialing" && snap.trialEndsAt && <div><dt className="text-xs text-muted">Trial ends</dt><dd className="font-medium">{fmtDate(snap.trialEndsAt)}</dd></div>}
          {snap.currentPeriodEnd && snap.status !== "trialing" && <div><dt className="text-xs text-muted">{snap.cancelAtPeriodEnd ? "Access ends" : "Renews"}</dt><dd className="font-medium">{fmtDate(snap.currentPeriodEnd)}</dd></div>}
          <div><dt className="text-xs text-muted">Seats</dt><dd className="font-medium">{snap.seats} <span className="text-muted font-normal">(members who have joined)</span></dd></div>
          <div><dt className="text-xs text-muted">Included recording</dt><dd className="font-medium">{snap.includedHours} h / month</dd></div>
        </dl>
        {snap.status === "past_due" && <p className="text-sm text-clay">Your last payment failed. Update the card below to keep recording after Stripe&apos;s retries end.</p>}
        {snap.cancelAtPeriodEnd && <p className="text-sm text-muted">Your subscription is set to cancel. You can resume it from the billing portal.</p>}
        <div className="flex flex-wrap gap-2">
          {org.stripeCustomerId && <form action={openPortalAction}><button className="btn-secondary">Manage billing</button></form>}
          {snap.status === "trialing" && <form action={startPaidPlanNowAction}><button className="btn-primary">Start paid plan now</button></form>}
          {(snap.status === "none" || snap.status === "canceled" || snap.status === "unpaid") && stripeConfigured() && <Link href="/billing/start" className="btn-primary">Choose a plan</Link>}
        </div>
        <p className="text-xs text-muted">Manage billing opens Stripe&apos;s secure portal: change your card, switch between Starter and Team or monthly/annual, download invoices, or cancel.</p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Recording this month</h2>
        <div className="h-2 rounded-full bg-paper-2 overflow-hidden"><div className={`h-full ${snap.overageHours > 0 ? "bg-copper" : "bg-merle"}`} style={{ width: `${pct}%` }} /></div>
        <div className="flex flex-wrap justify-between text-sm gap-2">
          <span>{snap.usedHours.toFixed(1)} h of {snap.status === "trialing" ? `${PRICING.trialHours} h trial allowance` : `${snap.includedHours} h included`}</span>
          {snap.overageHours > 0 && snap.status !== "trialing" && <span className="text-copper-deep">Overage {snap.overageHours.toFixed(1)} h · ${(snap.overageHours * PRICING.overagePerHour).toFixed(2)} so far</span>}
        </div>
        {!snap.recording.ok && <p className="text-sm text-clay">{snap.recording.reason}</p>}
        <p className="text-xs text-muted">On the {plan.name} plan each seat adds {plan.hoursPerSeat} hours to the shared pool. Hours beyond the pool are invoiced at ${PRICING.overagePerHour.toFixed(2)}/hour on the 1st of the next month. Uploaded transcripts don&apos;t count.</p>
      </section>
    </div>
  );
}
