import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg, billingRequired } from "@/lib/auth";
import { PRICING, checkoutTrialEnd, eligibleForTrial, isLocalTrial, seatCount, stripeConfigured, trialExpired } from "@/lib/billing";
import { signOutAction } from "@/app/actions/auth";
import { Mascot } from "@/components/mascot";
import { fmtDate } from "@/lib/utils";
import { db } from "@/lib/db";
import PlanPicker from "./plan-picker";

/** Add a card: to start the free trial, to keep a no-card trial going, after a trial ends, or to restart a cancelled plan. */
export default async function BillingStartPage({ searchParams }: PageProps<"/billing/start">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg({ skipBillingGate: true, skipCalendarGate: true });
  if (!stripeConfigured()) redirect("/dashboard");
  const hasPlan = org.billingStatus === "comped" || (org.stripeSubscriptionId && ["active", "past_due", "trialing"].includes(org.billingStatus));
  if (hasPlan) redirect("/settings/billing");

  const [seats, trialEnd, invited] = await Promise.all([seatCount(org.id), checkoutTrialEnd(org), db.membership.count({ where: { orgId: org.id, userId: null } })]);
  const admins = membership.isAdmin ? [] : await db.membership.findMany({ where: { orgId: org.id, isAdmin: true }, select: { name: true, email: true } });
  const onTrial = isLocalTrial(org) && !trialExpired(org);
  const blocked = billingRequired(org);
  const fresh = eligibleForTrial(org);

  const [title, blurb] = fresh
    ? ["Start your free trial", `Try everything free for ${PRICING.trialDays} days.`]
    : trialEnd
      ? ["Add a card to keep your trial", `You're free until ${fmtDate(trialEnd)}.`]
      : onTrial
        ? [`You've used your ${PRICING.trialHours} free hours`, "Add a card to keep recording."]
        : ["canceled", "unpaid"].includes(org.billingStatus)
          ? ["Restart Scoop", "Your meetings and tasks are still here."]
          : ["Your free trial has ended", "Your meetings and tasks are still here."];
  const footnote = trialEnd ? `No charge until ${fmtDate(trialEnd)}. Cancel anytime.` : "Cancel anytime.";

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <section className="flex flex-col items-center text-center mb-6">
          <Mascot pose="celebrate" size={80} />
          <h1 className="text-2xl font-bold tracking-tight mt-2">{title}</h1>
          <p className="text-ink-soft mt-1">{blurb}</p>
        </section>

        {sp.canceled && <p className="rounded-md bg-butter-soft border border-copper text-copper-deep text-sm p-3 mb-4 text-center">Checkout was cancelled. Nothing was charged.</p>}
        {typeof sp.error === "string" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3 mb-4">{sp.error === "admin_only" ? "Only an admin can add a card." : decodeURIComponent(sp.error)}</p>}

        {membership.isAdmin ? (
          <PlanPicker
            seats={seats}
            invited={invited}
            monthly={PRICING.seatMonthly}
            annual={PRICING.seatAnnualMonthly}
            cta={fresh ? "Start free trial" : trialEnd ? "Add card" : "Add card and start"}
            footnote={footnote}
          />
        ) : (
          <div className="card p-5 text-center">
            <p className="text-sm text-ink-soft">Ask {admins.map((a) => a.name).join(" or ") || "your admin"} to sign in and add a card. You&apos;ll have access the moment they do.</p>
          </div>
        )}

        <div className="text-xs text-muted mt-6 text-center space-y-1">
          <p>By continuing you agree to the <Link href="/terms" className="underline">Terms</Link>.{!blocked && <> · <Link href="/dashboard" className="underline">Back to Scoop</Link></>}</p>
          <form action={signOutAction}>{membership.email} · <button className="underline">Sign out</button></form>
        </div>
      </div>
    </main>
  );
}
