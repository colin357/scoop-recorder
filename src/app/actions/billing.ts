"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireOrg } from "@/lib/auth";
import { createCheckoutUrl, createPortalUrl, endTrialNow, setPhoneAddon, stripeConfigured, switchToCurrentPlan } from "@/lib/billing";
import { logActivity } from "@/lib/audit";

/** Add a card and start the subscription (keeps any trial time left). Admins only. */
export async function startCheckoutAction(form: FormData) {
  const { org, user, membership } = await requireOrg({ skipBillingGate: true, skipCalendarGate: true });
  if (!membership.isAdmin) redirect("/billing/start?error=admin_only");
  if (!stripeConfigured()) redirect("/dashboard");
  const interval = form.get("interval") === "year" ? "year" : "month";
  let url: string;
  try {
    url = await createCheckoutUrl(org, { interval, email: user.email });
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

/** Turn the phone-calls add-on on or off. */
export async function setPhoneAddonAction(on: boolean) {
  const { org, membership } = await requireAdmin();
  const back = on ? "/settings/billing?phone=on" : "/settings/billing?phone=off";
  try {
    await setPhoneAddon(org, on);
    await logActivity({ orgId: org.id, actorId: membership.id, action: on ? "billing.phone_on" : "billing.phone_off", entityType: "org", entityId: org.id, summary: `${membership.name} turned ${on ? "on" : "off"} the phone calls add-on` });
  } catch (e) {
    console.error("setPhoneAddon failed", e);
    redirect(`/settings/billing?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not change the add-on")}`);
  }
  revalidatePath("/settings/billing");
  revalidatePath("/calls");
  redirect(back);
}

/** Move a grandfathered Starter/Team subscription to the current per-person price. */
export async function switchToCurrentPlanAction() {
  const { org, membership } = await requireAdmin();
  try {
    await switchToCurrentPlan(org);
    await logActivity({ orgId: org.id, actorId: membership.id, action: "billing.plan_switched", entityType: "org", entityId: org.id, summary: `${membership.name} switched to the current per-person plan` });
  } catch (e) {
    console.error("switchToCurrentPlan failed", e);
    redirect(`/settings/billing?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not switch plans")}`);
  }
  revalidatePath("/settings/billing");
  redirect("/settings/billing?switched=1");
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
