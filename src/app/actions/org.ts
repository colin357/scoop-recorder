"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireOrg } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { postSlack, postTeams } from "@/lib/notify";
import { appUrl } from "@/lib/urls";

export async function updateOrgSettingsAction(form: FormData) {
  const { org, membership } = await requireAdmin();
  const retention = String(form.get("retentionDays") ?? "").trim();
  const data = {
    name: String(form.get("name") ?? org.name).trim() || org.name,
    botName: String(form.get("botName") ?? "").trim() || null,
    recordingNotice: form.get("recordingNotice") === "on",
    reviewBeforeAssign: form.get("reviewBeforeAssign") === "on",
    retentionDays: retention ? Math.max(1, parseInt(retention, 10) || 0) || null : null,
    slackWebhookUrl: String(form.get("slackWebhookUrl") ?? "").trim() || null,
    teamsWebhookUrl: String(form.get("teamsWebhookUrl") ?? "").trim() || null,
  };
  await db.organization.update({ where: { id: org.id }, data });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "org.settings_updated", entityType: "org", entityId: org.id, summary: `${membership.name} updated organization settings` });
  revalidatePath("/settings/organization");
}

export async function testWebhookAction(kind: "slack" | "teams") {
  const { org } = await requireAdmin();
  const link = `${appUrl()}/dashboard`;
  if (kind === "slack") await postSlack(org.slackWebhookUrl, `🐾 Scoop is connected to this channel for *${org.name}*. Meeting summaries and tasks will show up here. <${link}|Open Scoop>`);
  else await postTeams(org.teamsWebhookUrl, "Scoop is connected", `Meeting summaries and tasks for ${org.name} will show up here.`, [], link);
}

export async function updateProfileAction(form: FormData) {
  const { user, membership, org } = await requireOrg();
  const name = String(form.get("name") ?? "").trim() || user.name;
  await db.user.update({ where: { id: user.id }, data: { name } });
  await db.membership.update({
    where: { id: membership.id },
    data: { name, notifyByEmail: form.get("notifyByEmail") === "on", slackUserId: String(form.get("slackUserId") ?? "").trim() || null },
  });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "member.profile_updated", entityType: "member", entityId: membership.id, summary: `${name} updated their profile` });
  revalidatePath("/settings/profile");
}

export async function changePasswordAction(_: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { user } = await requireOrg();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  const bcrypt = (await import("bcryptjs")).default;
  if (user.passwordHash && !(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: true };
}

/**
 * Delete the whole workspace: cancels the Stripe subscription, removes recording
 * media at Recall, and drops the organization (memberships, meetings, tasks,
 * calendar connections and logs cascade). Admins only; the org name must be typed.
 */
export async function deleteWorkspaceAction(form: FormData) {
  const { org, user, membership } = await requireAdmin();
  const confirm = String(form.get("confirm") ?? "").trim();
  if (confirm.toLowerCase() !== org.name.trim().toLowerCase()) redirect("/settings/organization?error=confirm");

  const { stripe, stripeConfigured } = await import("@/lib/billing");
  if (stripeConfigured() && org.stripeSubscriptionId && !["canceled", "none"].includes(org.billingStatus)) {
    await stripe().subscriptions.cancel(org.stripeSubscriptionId, { prorate: false }).catch((e) => console.error("cancel subscription on delete", e));
  }
  const { deleteBotMedia, recallConfigured } = await import("@/lib/recall");
  if (recallConfigured()) {
    const bots = await db.meeting.findMany({ where: { orgId: org.id, recallBotId: { not: null }, recordingDeletedAt: null }, select: { recallBotId: true } });
    for (const b of bots) await deleteBotMedia(b.recallBotId!).catch((e) => console.error("deleteBotMedia on delete", e));
  }
  console.info(`workspace deleted: ${org.slug} by ${membership.email}`);
  await db.organization.delete({ where: { id: org.id } });
  await db.onboardingDraft.deleteMany({ where: { userId: user.id } });

  const remaining = await db.membership.count({ where: { userId: user.id } });
  redirect(remaining > 0 ? "/dashboard" : "/onboarding?deleted=workspace");
}

/**
 * Delete the signed-in user's account. If they are the only member of their
 * workspace the workspace goes too; if they are the only admin of a workspace
 * that has other members, they must hand off admin or delete the workspace first.
 */
export async function deleteAccountAction(form: FormData) {
  const { getCurrentUser, destroySession } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const confirm = String(form.get("confirm") ?? "").trim().toLowerCase();
  if (confirm !== user.email.toLowerCase()) redirect("/settings/profile?error=confirm");

  const memberships = await db.membership.findMany({ where: { userId: user.id }, include: { org: { include: { _count: { select: { members: true } } } } } });
  for (const m of memberships) {
    const others = m.org._count.members - 1;
    if (others === 0) {
      // Sole member: remove the workspace with it.
      const { stripe, stripeConfigured } = await import("@/lib/billing");
      if (stripeConfigured() && m.org.stripeSubscriptionId && !["canceled", "none"].includes(m.org.billingStatus)) {
        await stripe().subscriptions.cancel(m.org.stripeSubscriptionId, { prorate: false }).catch((e) => console.error("cancel subscription on account delete", e));
      }
      const { deleteBotMedia, recallConfigured } = await import("@/lib/recall");
      if (recallConfigured()) {
        const bots = await db.meeting.findMany({ where: { orgId: m.orgId, recallBotId: { not: null }, recordingDeletedAt: null }, select: { recallBotId: true } });
        for (const b of bots) await deleteBotMedia(b.recallBotId!).catch((e) => console.error("deleteBotMedia on account delete", e));
      }
      await db.organization.delete({ where: { id: m.orgId } });
    } else if (m.isAdmin) {
      const otherAdmins = await db.membership.count({ where: { orgId: m.orgId, isAdmin: true, id: { not: m.id } } });
      if (otherAdmins === 0) redirect("/settings/profile?error=sole_admin");
      await db.membership.delete({ where: { id: m.id } });
      await logActivity({ orgId: m.orgId, action: "member.left", entityType: "member", entityId: m.id, summary: `${m.name} deleted their account` });
    } else {
      await db.membership.delete({ where: { id: m.id } });
      await logActivity({ orgId: m.orgId, action: "member.left", entityType: "member", entityId: m.id, summary: `${m.name} deleted their account` });
    }
  }
  await db.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/?deleted=account");
}
