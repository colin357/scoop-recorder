import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { billingSnapshot, stripeConfigured } from "@/lib/billing";
import type { Organization } from "@/generated/prisma/client";

/** App-wide notice for billing states that need attention. Renders nothing when everything is fine. */
export default async function BillingBanner({ org, isAdmin }: { org: Organization; isAdmin: boolean }) {
  if (!stripeConfigured() || ["active", "comped"].includes(org.billingStatus)) return null;
  const snap = await billingSnapshot(org);
  let text: string | null = null;
  let tone = "bg-butter-soft border-copper text-copper-deep";
  if (snap.status === "past_due") {
    text = "A payment failed. Update your card so recording keeps working.";
    tone = "bg-clay-soft border-clay text-clay";
  } else if (snap.status === "trial_ended") {
    text = "Your free trial has ended, so recording is paused. Add a card to keep going; your summaries and tasks are still here.";
    tone = "bg-clay-soft border-clay text-clay";
  } else if (snap.status === "trialing" && !snap.recording.ok) {
    text = snap.recording.reason;
  } else if (snap.status === "trialing" && snap.trialEndsAt && !snap.hasCard) {
    const days = differenceInCalendarDays(snap.trialEndsAt, new Date());
    if (days <= 5) text = days <= 0 ? "Your free trial ends today. Add a card to keep recording." : `Your free trial ends in ${days} day${days === 1 ? "" : "s"}. Add a card to keep recording.`;
  } else if (["canceled", "unpaid"].includes(snap.status)) {
    text = "Your subscription has ended, so recording is paused. Summaries and tasks are still here.";
    tone = "bg-clay-soft border-clay text-clay";
  }
  if (!text) return null;
  return (
    <div className={`rounded-xl border text-sm px-4 py-2.5 mb-4 flex flex-wrap items-center justify-between gap-2 ${tone}`}>
      <span>{text}</span>
      {isAdmin ? <Link href={snap.hasCard ? "/settings/billing" : "/billing/start"} className="font-semibold underline">{snap.hasCard ? "Go to billing" : "Add a card"}</Link> : <span className="text-xs">Ask an admin to update billing.</span>}
    </div>
  );
}
