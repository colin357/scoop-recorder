import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PRICING, billingSnapshot, fmtUsd, legacyPlan, stripeConfigured } from "@/lib/billing";
import { twilioConfigured } from "@/lib/twilio";
import { openPortalAction, setPhoneAddonAction, startPaidPlanNowAction, switchToCurrentPlanAction } from "@/app/actions/billing";
import { fmtDate } from "@/lib/utils";

const STATUS: Record<string, { label: string; cls: string }> = {
  trialing: { label: "Free trial", cls: "bg-sky text-merle-deep" },
  trial_ended: { label: "Trial ended", cls: "bg-clay-soft text-clay" },
  active: { label: "Active", cls: "bg-grass-soft text-grass" },
  past_due: { label: "Payment failed", cls: "bg-clay-soft text-clay" },
  canceled: { label: "Cancelled", cls: "bg-paper-2 text-muted" },
  unpaid: { label: "Unpaid", cls: "bg-clay-soft text-clay" },
  comped: { label: "Complimentary", cls: "bg-butter-soft text-copper-deep" },
  none: { label: "No plan", cls: "bg-paper-2 text-muted" },
};

const hrs = (h: number) => (h < 10 ? h.toFixed(1) : Math.round(h).toString());

export default async function BillingSettingsPage({ searchParams }: PageProps<"/settings/billing">) {
  const sp = await searchParams;
  const { org } = await requireAdmin();
  const snap = await billingSnapshot(org);
  const st = STATUS[snap.status] ?? STATUS.none;
  const people = `${snap.seats} ${snap.seats === 1 ? "person" : "people"}`;
  const subscribed = snap.hasCard && ["active", "past_due", "trialing"].includes(snap.status);
  const needsCard = snap.configured && !subscribed && snap.status !== "comped";
  const legacy = snap.legacy ? legacyPlan(snap.legacy.key) : null;
  const canSwitch = subscribed && legacy != null && legacy.monthly > PRICING.seatMonthly;
  const phone = snap.phone;
  const trialPct = snap.trial ? Math.min(100, Math.round((snap.trial.usedHours / snap.trial.limitHours) * 100)) : 0;
  const phonePct = Math.min(100, Math.round((phone.usedHours / phone.includedHours) * 100));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted">Plan, people and usage for {org.name}. Admins only.</p>
      </div>

      {sp.checkout === "success" && <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">You&apos;re all set. Thanks for choosing Scoop!</p>}
      {sp.upgraded && <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">Your paid plan has started. Thanks!</p>}
      {sp.switched && <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">You&apos;re on the {fmtUsd(PRICING.seatMonthly)} per person plan now. The difference is credited on your next invoice.</p>}
      {sp.phone === "on" && <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">Phone calls are on. Head to the Calls tab to record one.</p>}
      {sp.phone === "off" && <p className="rounded-md bg-paper-2 border edge text-ink-soft text-sm p-3">Phone calls are off. Past calls are still in the Calls tab.</p>}
      {typeof sp.error === "string" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3">{decodeURIComponent(sp.error)}</p>}
      {!stripeConfigured() && <p className="rounded-md bg-butter-soft border border-copper text-copper-deep text-sm p-3">Billing is not configured on this deployment (STRIPE_SECRET_KEY), so recording is not gated.</p>}

      <section className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Plan</h2>
            <div className="text-sm text-muted mt-0.5">
              {subscribed ? (
                <>
                  <span className="font-medium text-ink">{legacy ? `${legacy.name} (your original price)` : "Scoop"}</span> · {fmtUsd(snap.perSeat)} per person / month, billed {snap.interval === "year" ? "annually" : "monthly"}
                </>
              ) : snap.status === "comped" ? (
                "Complimentary access"
              ) : snap.trial && snap.status === "trialing" ? (
                <>Free trial until {snap.trial.endsAt ? fmtDate(snap.trial.endsAt) : "soon"}. No card on file.</>
              ) : (
                "No plan yet"
              )}
            </div>
          </div>
          <span className={`badge ${st.cls}`}>{st.label}</span>
        </div>

        {subscribed && (
          <p className="text-sm" data-testid="plan-total">
            {people} × {fmtUsd(snap.perSeat)} = <span className="font-semibold">{fmtUsd(Math.round(snap.seats * snap.perSeat * 100) / 100)} a month</span>
            {phone.enabled && <span className="text-muted"> + phone calls {fmtUsd(phone.perMonth)}</span>}
          </p>
        )}

        <dl className="grid sm:grid-cols-3 gap-3 text-sm">
          {snap.status === "trialing" && snap.hasCard && snap.trialEndsAt && <div><dt className="text-xs text-muted">First charge</dt><dd className="font-medium">{fmtDate(snap.trialEndsAt)}</dd></div>}
          {snap.currentPeriodEnd && subscribed && snap.status !== "trialing" && <div><dt className="text-xs text-muted">{snap.cancelAtPeriodEnd ? "Access ends" : "Renews"}</dt><dd className="font-medium">{fmtDate(snap.currentPeriodEnd)}</dd></div>}
          <div><dt className="text-xs text-muted">People</dt><dd className="font-medium">{snap.seats} <span className="text-muted font-normal">(members who have joined)</span></dd></div>
        </dl>

        {snap.status === "past_due" && <p className="text-sm text-clay">Your last payment failed. Update the card below to keep recording after Stripe&apos;s retries end.</p>}
        {snap.cancelAtPeriodEnd && <p className="text-sm text-muted">Your subscription is set to cancel. You can resume it from the billing portal.</p>}

        {canSwitch && legacy && (
          <div className="rounded-xl bg-sky/60 border border-merle/20 p-3 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>Our pricing is simpler now: {fmtUsd(PRICING.seatMonthly)} per person with unlimited meetings. That&apos;s less than your {legacy.name} price.</span>
            <form action={switchToCurrentPlanAction}><button className="btn-secondary text-sm">Switch to {fmtUsd(PRICING.seatMonthly)}/person</button></form>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {needsCard && <Link href="/billing/start" className="btn-primary">{snap.status === "trialing" ? "Add a card" : "Choose monthly or annual"}</Link>}
          {snap.status === "trialing" && snap.hasCard && snap.trial && snap.trial.usedHours >= snap.trial.limitHours && <form action={startPaidPlanNowAction}><button className="btn-primary">Start paid plan now</button></form>}
          {org.stripeCustomerId && <form action={openPortalAction}><button className="btn-secondary">Manage billing</button></form>}
        </div>
        {org.stripeCustomerId && <p className="text-xs text-muted">Manage billing opens Stripe&apos;s secure portal: update your card, download invoices, or cancel.</p>}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Recording</h2>
        {snap.trial && snap.status === "trialing" ? (
          <>
            <div className="h-2 rounded-full bg-paper-2 overflow-hidden"><div className={`h-full ${trialPct >= 100 ? "bg-copper" : "bg-merle"}`} style={{ width: `${trialPct}%` }} /></div>
            <p className="text-sm">{hrs(snap.trial.usedHours)} h of {snap.trial.limitHours} free trial hours used (meetings and calls).</p>
          </>
        ) : (
          <p className="text-sm"><span className="font-medium">{hrs(snap.usedHours)} h</span> recorded this month. Meetings are unlimited.</p>
        )}
        {!snap.recording.ok && <p className="text-sm text-clay">{snap.recording.reason}</p>}
        {snap.status !== "trialing" && (
          <p className="text-xs text-muted">
            Fair use: about {PRICING.fairUseHoursPerSeat} hours per person per month, averaged across your team ({snap.fairUseHours} h for {people}). Almost every team is well under. If you&apos;re over for two months in a row we&apos;ll get in touch; we never charge extra for meetings. Uploaded transcripts don&apos;t count.
          </p>
        )}
      </section>

      {twilioConfigured() && (
        <section className="card p-5 space-y-3" id="phone">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Phone calls</h2>
              <p className="text-sm text-muted mt-0.5">
                {fmtUsd(phone.perMonth)} / month for the workspace{snap.interval === "year" ? ", billed annually" : ""} · {phone.includedHours} hours of calls included · {fmtUsd(PRICING.phoneOveragePerHour)} per extra hour
              </p>
            </div>
            <span className={`badge ${phone.enabled || snap.status === "comped" ? "bg-grass-soft text-grass" : snap.status === "trialing" ? "bg-sky text-merle-deep" : "bg-paper-2 text-muted"}`}>
              {phone.enabled ? "On" : snap.status === "comped" ? "Included" : snap.status === "trialing" ? "In your trial" : "Off"}
            </span>
          </div>

          {phone.enabled && (
            <>
              <div className="h-2 rounded-full bg-paper-2 overflow-hidden"><div className={`h-full ${phone.overageHours > 0 ? "bg-copper" : "bg-merle"}`} style={{ width: `${phonePct}%` }} /></div>
              <div className="flex flex-wrap justify-between text-sm gap-2">
                <span>{hrs(phone.usedHours)} h of {phone.includedHours} h used this month</span>
                {phone.overageHours > 0 && <span className="text-copper-deep">{hrs(phone.overageHours)} extra h · {fmtUsd(phone.overageCost)} so far, invoiced on the 1st</span>}
              </div>
            </>
          )}
          {!phone.enabled && snap.status === "trialing" && <p className="text-sm text-ink-soft">Phone calls are included while you try Scoop. After the trial they&apos;re this add-on; turn it on whenever you like.</p>}
          {!phone.enabled && snap.status === "comped" && <p className="text-sm text-ink-soft">Included with your complimentary access.</p>}

          {subscribed && (
            <form action={setPhoneAddonAction.bind(null, !phone.enabled)}>
              <button className={phone.enabled ? "btn-ghost text-sm" : "btn-accent"}>{phone.enabled ? "Turn off phone calls" : `Turn on phone calls · ${fmtUsd(phone.perMonth)}/mo`}</button>
            </form>
          )}
          {!subscribed && snap.status !== "comped" && snap.configured && <p className="text-xs text-muted">Add a card first, then you can turn on phone calls here.</p>}
          {subscribed && <p className="text-xs text-muted">{phone.enabled ? "Turning it off stops new calls; past calls stay. " : ""}Changes are prorated on your next invoice.</p>}
        </section>
      )}
    </div>
  );
}
