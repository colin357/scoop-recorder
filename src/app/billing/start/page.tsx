import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg, billingRequired } from "@/lib/auth";
import { PLANS, PRICING, fmtUsd, seatCount, seatPrice } from "@/lib/billing";
import { startCheckoutAction } from "@/app/actions/billing";
import { signOutAction } from "@/app/actions/auth";
import { Mascot } from "@/components/mascot";
import { Icon } from "@/components/icons";
import { db } from "@/lib/db";

/** Gate after onboarding: the organization picks a plan and starts its 14-day trial (card required). */
export default async function BillingStartPage({ searchParams }: PageProps<"/billing/start">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg({ skipBillingGate: true, skipCalendarGate: true });
  if (!billingRequired(org.billingStatus)) redirect("/dashboard");
  const seats = await seatCount(org.id);
  const admins = membership.isAdmin ? [] : await db.membership.findMany({ where: { orgId: org.id, isAdmin: true }, select: { name: true, email: true } });
  const seatLabel = `${seats} seat${seats === 1 ? "" : "s"}`;

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <section className="hero relative overflow-hidden rounded-2xl border edge shadow-soft p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
          <Mascot pose="celebrate" size={120} className="relative shrink-0" />
          <div className="relative">
            <div className="eyebrow">Almost there</div>
            <h1 className="text-2xl font-bold tracking-tight">Pick a plan, start your {PRICING.trialDays}-day free trial</h1>
            <p className="text-ink-soft text-sm mt-1">
              Add a card to unlock recording for {org.name}. You won&apos;t be charged until the trial ends, and you can cancel or switch plans any time from Settings.
            </p>
          </div>
        </section>

        {sp.canceled && <p className="rounded-md bg-butter-soft border border-copper text-copper-deep text-sm p-3 mb-4">Checkout was cancelled. Nothing was charged; pick a plan whenever you&apos;re ready.</p>}
        {typeof sp.error === "string" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3 mb-4">{sp.error === "admin_only" ? "Only an admin can start the subscription." : decodeURIComponent(sp.error)}</p>}

        {membership.isAdmin ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const featured = plan.key === "team";
              const monthly = seatPrice(plan.key, "month");
              const annual = seatPrice(plan.key, "year");
              return (
                <form key={plan.key} action={startCheckoutAction} className={`card p-5 flex flex-col ${featured ? "border-merle ring-2 ring-merle/20" : ""}`}>
                  <input type="hidden" name="plan" value={plan.key} />
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">{plan.name}</span>
                    {featured && <span className="badge bg-sky text-merle-deep">Most popular</span>}
                  </div>
                  <span className="block text-3xl font-display font-bold mt-1">{fmtUsd(monthly)}<span className="text-base font-medium text-muted"> / seat / mo</span></span>
                  <span className="block text-sm text-muted mt-0.5">{plan.blurb}</span>
                  <ul className="text-sm mt-3 space-y-1">
                    <li className="flex gap-2"><Icon name="check" size={16} className="text-grass mt-0.5 shrink-0" />{plan.hoursPerSeat} recording hours per seat per month, pooled</li>
                    <li className="flex gap-2"><Icon name="check" size={16} className="text-grass mt-0.5 shrink-0" />{seatLabel} · {seats * plan.hoursPerSeat} h for your team</li>
                  </ul>
                  <div className="mt-auto pt-4 grid gap-2">
                    <button name="interval" value="year" className={featured ? "btn-primary w-full" : "btn-secondary w-full"}>
                      Annual · {fmtUsd(annual)}/seat/mo <span className="opacity-70 font-normal">· save 20%</span>
                    </button>
                    <button name="interval" value="month" className="btn-ghost w-full text-sm">Monthly · {fmtUsd(monthly)}/seat/mo</button>
                  </div>
                </form>
              );
            })}
          </div>
        ) : (
          <div className="card p-5">
            <h2 className="font-semibold">An admin needs to start the subscription</h2>
            <p className="text-sm text-muted mt-1">Ask {admins.map((a) => `${a.name} (${a.email})`).join(" or ") || "your admin"} to sign in and pick a plan. You&apos;ll get access the moment they do.</p>
          </div>
        )}

        <ul className="card p-5 mt-4 text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {[
            `${PRICING.trialHours} recording hours during the trial, on either plan`,
            `Extra hours $${PRICING.overagePerHour.toFixed(2)} each, invoiced monthly`,
            "Unlimited summaries, tasks and Ask Rocky",
            "Switch plans or cancel any time",
          ].map((t) => <li key={t} className="flex gap-2"><Icon name="check" size={16} className="text-grass mt-0.5 shrink-0" />{t}</li>)}
        </ul>

        <p className="text-xs text-muted mt-4">By starting a trial you agree to the <Link href="/terms" className="text-merle underline">Terms of Service</Link>, including automatic renewal after the trial unless you cancel.</p>
        <form action={signOutAction} className="text-xs text-muted mt-6">
          Signed in as {membership.email}. <button className="underline">Not you? Sign out</button>
        </form>
      </div>
    </main>
  );
}
