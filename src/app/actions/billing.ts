"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireOrg } from "@/lib/auth";
import { createCheckoutUrl, createPortalUrl, endTrialNow, stripeConfigured, PLANS, type PlanKey } from "@/lib/billing";
import { logActivity } from "@/lib/audit";

/** Start Checkout (trial on first subscription). Admins only. */
export async function startCheckoutAction(form: FormData) {
  const { org, user, membership } = await requireOrg({ skipBillingGate: true, skipCalendarGate: true });
  if (!membership.isAdmin) redirect("/billing/start?error=admin_only");
  if (!stripeConfigured()) redirect("/dashboard");
  const interval = form.get("interval") === "year" ? "year" : "month";
  const planRaw = String(form.get("plan") ?? "team");
  const plan: PlanKey = PLANS.some((p) => p.key === planRaw) ? (planRaw as PlanKey) : "team";
  let url: string;
  try {
    url = await createCheckoutUrl(org, { plan, interval, email: user.email });
  } catch (e) {
    console.error("checkout failed", e);
    redirect(`/billing/start?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not start checkout")}`);
  }
  redirect(url);
}

/** Open the Stripe customer portal (card, invoices, plan changes, cancel). */
export async function openPortalAction() {
  const { org } = await requireAdmin();
  let url: string;
  try {
    url = await createPortalUrl(org);
  } catch (e) {
    console.error("portal failed", e);
    redirect(`/settings/billing?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not open billing portal")}`);
  }
  redirect(url);
}

/** Convert a trial to a paid plan immediately (e.g. when the trial allowance is used up). */
export async function startPaidPlanNowAction() {
  const { org, membership } = await requireAdmin();
  if (org.billingStatus !== "trialing") redirect("/settings/billing");
  try {
    await endTrialNow(org);
    await logActivity({ orgId: org.id, actorId: membership.id, action: "billing.trial_ended_early", entityType: "org", entityId: org.id, summary: `${membership.name} started the paid plan before the trial ended` });
  } catch (e) {
    console.error("endTrialNow failed", e);
    redirect(`/settings/billing?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not start the plan")}`);
  }
  revalidatePath("/settings/billing");
  redirect("/settings/billing?upgraded=1");
}

/** Operator-only: mark an organization as complimentary (no subscription needed) or revert it. */
export async function setCompedAction(orgId: string, comped: boolean) {
  const { user } = await requireOrg();
  const allowed = (process.env.SUPERADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) redirect("/dashboard");
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  await db.organization.update({
    where: { id: orgId },
    data: comped ? { billingStatus: "comped" } : { billingStatus: org.stripeSubscriptionId ? "active" : "none" },
  });
  await logActivity({ orgId, action: comped ? "billing.comped" : "billing.uncomped", entityType: "org", entityId: orgId, summary: comped ? `${user.name} marked this organization complimentary` : `${user.name} removed complimentary billing` });
  revalidatePath("/admin");
}
