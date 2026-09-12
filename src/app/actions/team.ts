"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin, requireOrg } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { syncSeats } from "@/lib/billing";
import { sendEmail, templates } from "@/lib/email";
import { appUrl } from "@/lib/urls";

export async function upsertMemberAction(form: FormData) {
  const { org, membership: actor } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const data = {
    name: String(form.get("name") ?? "").trim(),
    role: String(form.get("role") ?? "").trim(),
    responsibilities: String(form.get("responsibilities") ?? "").trim(),
    isAdmin: form.get("isAdmin") === "on",
  };
  if (!data.name || !email) return;
  if (id) {
    if (id === actor.id) data.isAdmin = true; // can't demote yourself
    await db.membership.updateMany({ where: { id, orgId: org.id }, data });
    await logActivity({ orgId: org.id, actorId: actor.id, action: "member.updated", entityType: "member", entityId: id, summary: `${actor.name} updated ${data.name}` });
  } else {
    const user = await db.user.findUnique({ where: { email } });
    const member = await db.membership.upsert({
      where: { orgId_email: { orgId: org.id, email } },
      update: data,
      create: { ...data, email, orgId: org.id, userId: user?.id ?? null },
    });
    await logActivity({ orgId: org.id, actorId: actor.id, action: "member.added", entityType: "member", entityId: member.id, summary: `${actor.name} added ${data.name} (${email})` });
    if (!member.userId) await sendInvite(member.id, actor.name, org.name);
  }
  revalidatePath("/settings/team");
}

async function sendInvite(memberId: string, inviterName: string, orgName: string) {
  const token = randomBytes(24).toString("hex");
  const member = await db.membership.update({ where: { id: memberId }, data: { inviteToken: token, invitedAt: new Date() } });
  await sendEmail({ to: member.email, ...templates.invite({ inviterName, orgName, link: `${appUrl()}/invite/${token}` }) }).catch((e) => console.error("invite email failed", e));
}

export async function resendInviteAction(memberId: string) {
  const { org, membership } = await requireAdmin();
  const m = await db.membership.findFirst({ where: { id: memberId, orgId: org.id, userId: null } });
  if (!m) return;
  await sendInvite(m.id, membership.name, org.name);
  await logActivity({ orgId: org.id, actorId: membership.id, action: "member.invited", entityType: "member", entityId: m.id, summary: `${membership.name} re-sent the invitation to ${m.email}` });
  revalidatePath("/settings/team");
}

export async function removeMemberAction(memberId: string) {
  const { org, membership } = await requireAdmin();
  if (memberId === membership.id) return;
  const m = await db.membership.findFirst({ where: { id: memberId, orgId: org.id } });
  if (!m) return;
  await db.membership.delete({ where: { id: memberId } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "member.removed", entityType: "member", entityId: memberId, summary: `${membership.name} removed ${m.name}` });
  await syncSeats(org.id);
  revalidatePath("/settings/team");
}

/** Accept an invitation for the signed-in user (email must match). */
export async function acceptInvite(token: string, userId: string, email: string) {
  const m = await db.membership.findUnique({ where: { inviteToken: token } });
  if (!m) return { error: "This invitation link is no longer valid." };
  if (m.email !== email.toLowerCase()) return { error: `This invitation was sent to ${m.email}. Sign in with that address to accept it.` };
  await db.membership.update({ where: { id: m.id }, data: { userId, inviteToken: null } });
  await logActivity({ orgId: m.orgId, actorId: m.id, action: "member.joined", entityType: "member", entityId: m.id, summary: `${m.name} accepted the invitation` });
  await syncSeats(m.orgId);
  return { ok: true };
}

export async function createProjectAction(form: FormData) {
  const { org } = await requireOrg();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const memberIds = form.getAll("memberIds").map(String).filter(Boolean);
  await db.project.create({
    data: {
      orgId: org.id,
      name,
      description: String(form.get("description") ?? "").trim() || null,
      color: String(form.get("color") ?? "#6366f1"),
      members: { create: memberIds.map((memberId) => ({ memberId })) },
    },
  });
  revalidatePath("/projects");
}

export async function deleteProjectAction(projectId: string) {
  const { org, membership } = await requireAdmin();
  const p = await db.project.findFirst({ where: { id: projectId, orgId: org.id } });
  if (!p) return;
  await db.project.delete({ where: { id: projectId } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "project.deleted", entityType: "project", entityId: projectId, summary: `${membership.name} deleted project “${p.name}”` });
  revalidatePath("/projects");
}

// ---------- Project suggestions ----------

import { suggestProjects } from "@/lib/onboarding-ai";

export type ProjectSuggestion = { name: string; description: string; reason: string };

export async function suggestProjectsAction(): Promise<ProjectSuggestion[]> {
  const { org } = await requireOrg();
  const [existing, meetings] = await Promise.all([
    db.project.findMany({ where: { orgId: org.id }, select: { name: true, description: true } }),
    db.meeting.findMany({ where: { orgId: org.id, summary: { not: null } }, orderBy: { createdAt: "desc" }, take: 10, select: { title: true, summary: true } }),
  ]);
  const res = await suggestProjects({ businessDescription: org.businessDescription, existingProjects: existing, recentMeetings: meetings });
  return res.projects;
}

export async function createProjectsBulkAction(projects: { name: string; description: string }[]) {
  const { org } = await requireOrg();
  const count = await db.project.count({ where: { orgId: org.id } });
  const PAL = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  await db.project.createMany({
    data: projects.filter((p) => p.name.trim()).map((p, i) => ({ orgId: org.id, name: p.name.trim(), description: p.description.trim() || null, color: PAL[(count + i) % PAL.length] })),
  });
  revalidatePath("/projects");
}

export async function updateBusinessDescriptionAction(form: FormData) {
  const { org } = await requireOrg();
  await db.organization.update({ where: { id: org.id }, data: { businessDescription: String(form.get("businessDescription") ?? "").trim() || null } });
  revalidatePath("/projects");
}
