import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg, billingRequired } from "@/lib/auth";
import { PRICING, annualPerSeatPerMonth, fmtUsd, seatCount, seatPrice } from "@/lib/billing";
import { startCheckoutAction } from "@/app/actions/billing";
import { signOutAction } from "@/app/actions/auth";
import { Mascot } from "@/components/mascot";
import { Icon } from "@/components/icons";
import { db } from "@/lib/db";

/** Gate after onboarding: the organization starts its 14-day trial (card required) before using the app. */
export default async function BillingStartPage({ searchParams }: PageProps<"/billing/start">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg({ skipBillingGate: true, skipCalendarGate: true });
  if (!billingRequired(org.billingStatus)) redirect("/dashboard");
  const seats = await seatCount(org.id);
  const admins = membership.isAdmin ? [] : await db.membership.findMany({ where: { orgId: org.id, isAdmin: true }, select: { name: true, email: true } });
  const monthly = seatPrice(seats, "month");
  const annual = seatPrice(seats, "year");

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <section className="hero relative overflow-hidden rounded-2xl border edge shadow-soft p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
          <Mascot pose="celebrate" size={120} className="relative shrink-0" />
          <div className="relative">
            <div className="eyebrow">Almost there</div>
            <h1 className="text-2xl font-bold tracking-tight">Start your {PRICING.trialDays}-day free trial</h1>
            <p className="text-ink-soft text-sm mt-1">
              Add a card to unlock recording for {org.name}. You won&apos;t be charged until the trial ends, and you can cancel any time from Settings.
            </p>
          </div>
        </section>

        {sp.canceled && <p className="rounded-md bg-butter-soft border border-copper text-copper-deep text-sm p-3 mb-4">Checkout was cancelled. Nothing was charged; pick a plan whenever you&apos;re ready.</p>}
        {typeof sp.error === "string" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3 mb-4">{sp.error === "admin_only" ? "Only an admin can start the subscription." : decodeURIComponent(sp.error)}</p>}

        {membership.isAdmin ? (
          <form action={startCheckoutAction} className="grid gap-3 sm:grid-cols-2">
            <button name="interval" value="month" className="card p-5 text-left hover:border-merle hover:-translate-y-0.5 transition">
              <span className="eyebrow">Monthly</span>
              <span className="block text-3xl font-display font-bold mt-1">${monthly}<span className="text-base font-medium text-muted"> / seat / mo</span></span>
              <span className="block text-sm text-muted mt-1">{seats} seat{seats === 1 ? "" : "s"} · ${monthly * seats}/month after the trial</span>
              <span className="btn-secondary mt-4 w-full">Start free trial</span>
            </button>
            <button name="interval" value="year" className="card p-5 text-left border-merle ring-2 ring-merle/20 hover:-translate-y-0.5 transition">
              <span className="eyebrow flex items-center gap-2">Annual <span className="badge bg-grass-soft text-grass">Save 20%</span></span>
              <span className="block text-3xl font-display font-bold mt-1">{fmtUsd(annual)}<span className="text-base font-medium text-muted"> / seat / mo</span></span>
              <span className="block text-sm text-muted mt-1">{seats} seat{seats === 1 ? "" : "s"} · ${Math.round(annual * seats * 12)}/year after the trial</span>
              <span className="btn-primary mt-4 w-full">Start free trial</span>
            </button>
          </form>
        ) : (
          <div className="card p-5">
            <h2 className="font-semibold">An admin needs to start the subscription</h2>
            <p className="text-sm text-muted mt-1">Ask {admins.map((a) => `${a.name} (${a.email})`).join(" or ") || "your admin"} to sign in and pick a plan. You&apos;ll get access the moment they do.</p>
          </div>
        )}

        <div className="card p-5 mt-4 grid sm:grid-cols-2 gap-4 text-sm">
          <ul className="space-y-1.5">
            {[
              `${PRICING.includedHoursPerSeat} recording hours per seat per month, pooled across your team`,
              `Overage $${PRICING.overagePerHour.toFixed(2)}/hour, invoiced monthly`,
              `${PRICING.trialHours} recording hours during the trial`,
              "Unlimited members can read summaries and tasks",
            ].map((t) => <li key={t} className="flex gap-2"><Icon name="check" size={16} className="text-grass mt-0.5 shrink-0" />{t}</li>)}
          </ul>
          <div>
            <div className="eyebrow mb-1">Volume pricing, per seat</div>
            <table className="w-full text-xs">
              <tbody>
                {PRICING.tiers.map((t, i) => {
                  const from = i === 0 ? 1 : (PRICING.tiers[i - 1].upTo ?? 0) + 1;
                  return (
                    <tr key={String(t.upTo)} className="border-t border-line/60">
                      <td className="py-1 text-muted">{t.upTo ? `${from}–${t.upTo} seats` : `${from}+ seats`}</td>
                      <td className="py-1 text-right">${t.monthly}/mo</td>
                      <td className="py-1 text-right text-muted">{fmtUsd(annualPerSeatPerMonth(t.monthly))} annual</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted mt-4">By starting a trial you agree to the <Link href="/terms" className="text-merle underline">Terms of Service</Link>, including automatic renewal after the trial unless you cancel.</p>
        <form action={signOutAction} className="text-xs text-muted mt-6">
          Signed in as {membership.email}. <button className="underline">Not you? Sign out</button>
        </form>
      </div>
    </main>
  );
}
