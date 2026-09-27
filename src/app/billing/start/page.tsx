import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrg, billingRequired } from "@/lib/auth";
import { PRICING, isLocalTrial, seatCount, stripeConfigured, trialExpired, trialKeptAtCheckout } from "@/lib/billing";
import { signOutAction } from "@/app/actions/auth";
import { Mascot } from "@/components/mascot";
import { Icon } from "@/components/icons";
import { fmtDate } from "@/lib/utils";
import { db } from "@/lib/db";
import PlanPicker from "./plan-picker";

/** Add a card: during the free trial (keeps the days left), after it ends, or to restart a cancelled plan. */
export default async function BillingStartPage({ searchParams }: PageProps<"/billing/start">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg({ skipBillingGate: true, skipCalendarGate: true });
  if (!stripeConfigured()) redirect("/dashboard");
  const hasPlan = org.billingStatus === "comped" || (org.stripeSubscriptionId && ["active", "past_due", "trialing"].includes(org.billingStatus));
  if (hasPlan) redirect("/settings/billing");

  const [seats, keepUntil] = await Promise.all([seatCount(org.id), trialKeptAtCheckout(org)]);
  const admins = membership.isAdmin ? [] : await db.membership.findMany({ where: { orgId: org.id, isAdmin: true }, select: { name: true, email: true } });
  const onTrial = isLocalTrial(org) && !trialExpired(org);
  const blocked = billingRequired(org.billingStatus);

  const [title, blurb] = keepUntil
    ? ["Keep Rocky after your trial", `Your free trial runs until ${fmtDate(keepUntil)}. Add a card now and you won't be charged until then. Cancel any time before and you pay nothing.`]
    : onTrial
      ? [`You've used your ${PRICING.trialHours} free hours`, "Add a card to keep recording. Your plan starts today."]
      : ["canceled", "unpaid"].includes(org.billingStatus)
        ? ["Restart Scoop", "Your summaries and tasks are still here. Add a card to start recording again."]
        : ["Your free trial has ended", "Your summaries and tasks are still here. Add a card to keep recording."];

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <section className="flex flex-col items-center text-center mb-6">
          <Mascot pose="celebrate" size={112} />
          <h1 className="text-2xl font-bold tracking-tight mt-3">{title}</h1>
          <p className="text-ink-soft text-sm mt-1">{blurb}</p>
        </section>

        {sp.canceled && <p className="rounded-md bg-butter-soft border border-copper text-copper-deep text-sm p-3 mb-4">Checkout was cancelled. Nothing was charged.</p>}
        {typeof sp.error === "string" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3 mb-4">{sp.error === "admin_only" ? "Only an admin can add a card." : decodeURIComponent(sp.error)}</p>}

        {membership.isAdmin ? (
          <PlanPicker seats={seats} monthly={PRICING.seatMonthly} annual={PRICING.seatAnnualMonthly} cta={keepUntil ? "Add card" : "Add card and start"} />
        ) : (
          <div className="card p-5">
            <h2 className="font-semibold">An admin needs to add a card</h2>
            <p className="text-sm text-muted mt-1">Ask {admins.map((a) => `${a.name} (${a.email})`).join(" or ") || "your admin"} to sign in and add one. You&apos;ll be able to record again the moment they do.</p>
          </div>
        )}

        <ul className="mt-4 text-sm space-y-1.5 px-1">
          {["Unlimited meetings, summaries and tasks", "Ask Rocky, calendar auto-join, every feature", "Add people any time; you pay for who joins", "Cancel any time from Settings"].map((t) => (
            <li key={t} className="flex gap-2"><Icon name="check" size={16} className="text-grass mt-0.5 shrink-0" />{t}</li>
          ))}
        </ul>

        <p className="text-xs text-muted mt-5">
          By adding a card you agree to the <Link href="/terms" className="text-merle underline">Terms of Service</Link>, including automatic renewal unless you cancel.
        </p>
        <div className="text-xs text-muted mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {!blocked && <Link href="/dashboard" className="underline">Back to Scoop</Link>}
          <form action={signOutAction}>Signed in as {membership.email}. <button className="underline">Not you? Sign out</button></form>
        </div>
      </div>
    </main>
  );
}
