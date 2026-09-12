"use server";

import { revalidatePath } from "next/cache";
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
