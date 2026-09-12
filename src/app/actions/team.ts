"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export async function upsertMemberAction(form: FormData) {
  const { org } = await requireOrg();
  const id = String(form.get("id") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const data = {
    name: String(form.get("name") ?? "").trim(),
    role: String(form.get("role") ?? "").trim(),
    responsibilities: String(form.get("responsibilities") ?? "").trim(),
  };
  if (!data.name || !email) return;
  if (id) {
    await db.membership.updateMany({ where: { id, orgId: org.id }, data });
  } else {
    const user = await db.user.findUnique({ where: { email } });
    await db.membership.upsert({
      where: { orgId_email: { orgId: org.id, email } },
      update: data,
      create: { ...data, email, orgId: org.id, userId: user?.id ?? null },
    });
  }
  revalidatePath("/settings/team");
}

export async function removeMemberAction(memberId: string) {
  const { org, membership } = await requireOrg();
  if (memberId === membership.id) return;
  await db.membership.deleteMany({ where: { id: memberId, orgId: org.id } });
  revalidatePath("/settings/team");
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
  const { org } = await requireOrg();
  await db.project.deleteMany({ where: { id: projectId, orgId: org.id } });
  revalidatePath("/projects");
}
