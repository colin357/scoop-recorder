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
  } else if (snap.status === "trialing" && !snap.recording.ok) {
    text = snap.recording.reason;
  } else if (snap.status === "trialing" && snap.trialEndsAt) {
    const days = differenceInCalendarDays(snap.trialEndsAt, new Date());
    if (days <= 3) text = days <= 0 ? "Your free trial ends today." : `Your free trial ends in ${days} day${days === 1 ? "" : "s"}.`;
  } else if (["canceled", "unpaid"].includes(snap.status)) {
    text = "Your subscription has ended, so recording is paused. Summaries and tasks are still here.";
    tone = "bg-clay-soft border-clay text-clay";
  }
  if (!text) return null;
  return (
    <div className={`rounded-xl border text-sm px-4 py-2.5 mb-4 flex flex-wrap items-center justify-between gap-2 ${tone}`}>
      <span>{text}</span>
      {isAdmin ? <Link href="/settings/billing" className="font-semibold underline">Go to billing</Link> : <span className="text-xs">Ask an admin to update billing.</span>}
    </div>
  );
}
