"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { notifyTaskAssigned } from "@/lib/notify";
import { isRecurrence, nextOccurrence, recurrenceLabel, type Recurrence } from "@/lib/recurrence";
import { STATUS_LABEL, fmtDate } from "@/lib/utils";

async function ownedTask(taskId: string) {
  const { org, membership } = await requireOrg();
  const task = await db.task.findFirst({ where: { id: taskId, orgId: org.id }, include: { assignee: true } });
  if (!task) throw new Error("Task not found");
  return { org, membership, task };
}

export async function updateTaskAction(taskId: string, patch: {
  status?: string;
  assigneeId?: string | null;
  projectId?: string | null;
  dueDate?: string | null;
  priority?: string;
  title?: string;
  description?: string;
  recurrence?: string | null;
}) {
  const { org, membership, task: before } = await ownedTask(taskId);
  await db.task.update({
    where: { id: taskId },
    data: {
      ...(patch.status !== undefined && {
        status: patch.status,
        completedAt: patch.status === "done" ? new Date() : null,
      }),
      ...(patch.assigneeId !== undefined && { assigneeId: patch.assigneeId || null }),
      ...(patch.projectId !== undefined && { projectId: patch.projectId || null }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate ? new Date(patch.dueDate) : null }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.recurrence !== undefined && { recurrence: isRecurrence(patch.recurrence) ? patch.recurrence : null }),
    },
  });
  // A recurring task that was just completed spawns its next occurrence.
  if (patch.status === "done" && before.status !== "done" && isRecurrence(before.recurrence)) {
    await spawnNextOccurrence(taskId, before.recurrence);
  }
  // Activity + notifications for meaningful changes
  const changes: string[] = [];
  if (patch.status !== undefined && patch.status !== before.status) changes.push(`status → ${STATUS_LABEL[patch.status] ?? patch.status}`);
  if (patch.assigneeId !== undefined && (patch.assigneeId || null) !== before.assigneeId) {
    const a = patch.assigneeId ? await db.membership.findUnique({ where: { id: patch.assigneeId } }) : null;
    changes.push(`assignee → ${a?.name ?? "Unassigned"}`);
    if (a) notifyTaskAssigned(taskId).catch(() => {});
  }
  if (patch.dueDate !== undefined) changes.push(`due → ${patch.dueDate ? fmtDate(new Date(patch.dueDate)) : "none"}`);
  if (patch.priority !== undefined && patch.priority !== before.priority) changes.push(`priority → ${patch.priority}`);
  if (patch.title !== undefined && patch.title !== before.title) changes.push("title edited");
  if (patch.description !== undefined && patch.description !== before.description) changes.push("description edited");
  if (patch.recurrence !== undefined && (patch.recurrence || null) !== before.recurrence) changes.push(`repeats → ${recurrenceLabel(patch.recurrence) ?? "never"}`);
  if (changes.length) {
    await logActivity({ orgId: org.id, actorId: membership.id, action: "task.updated", entityType: "task", entityId: taskId, summary: `${membership.name} changed ${changes.join(", ")} on “${before.title}”`, meta: patch });
  }
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
}

export async function addCommentAction(taskId: string, form: FormData) {
  const { org, membership, task } = await ownedTask(taskId);
  const body = String(form.get("body") ?? "").trim();
  if (!body) return;
  await db.taskComment.create({ data: { taskId, memberId: membership.id, body } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "task.commented", entityType: "task", entityId: taskId, summary: `${membership.name} commented on “${task.title}”` });
  revalidatePath(`/tasks/${taskId}`);
}

export async function toggleStepAction(stepId: string, done: boolean) {
  const step = await db.taskStep.findUniqueOrThrow({ where: { id: stepId } });
  await ownedTask(step.taskId);
  await db.taskStep.update({ where: { id: stepId }, data: { completedAt: done ? new Date() : null } });
  revalidatePath(`/tasks/${step.taskId}`);
}

export async function createTaskAction(form: FormData) {
  const { org } = await requireOrg();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return;
  const dueDate = String(form.get("dueDate") ?? "");
  const recurrence = String(form.get("recurrence") ?? "");
  const created = await db.task.create({
    data: {
      orgId: org.id,
      title,
      description: String(form.get("description") ?? ""),
      projectId: String(form.get("projectId") ?? "") || null,
      assigneeId: String(form.get("assigneeId") ?? "") || null,
      priority: String(form.get("priority") ?? "medium"),
      dueDate: dueDate ? new Date(dueDate) : null,
      recurrence: isRecurrence(recurrence) ? recurrence : null,
    },
  });
  const { membership } = await requireOrg();
  await logActivity({ orgId: org.id, actorId: membership.id, action: "task.created", entityType: "task", entityId: created.id, summary: `${membership.name} created “${title}”` });
  if (created.assigneeId) notifyTaskAssigned(created.id).catch(() => {});
  revalidatePath("/tasks");
  redirect("/tasks?toast=Task+created");
}

export async function deleteTaskAction(taskId: string) {
  const { org, membership, task } = await ownedTask(taskId);
  if (!membership.isAdmin && task.assigneeId !== membership.id) throw new Error("Only admins or the assignee can delete a task");
  await db.task.delete({ where: { id: taskId } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "task.deleted", entityType: "task", entityId: taskId, summary: `${membership.name} deleted “${task.title}”` });
  revalidatePath("/tasks");
  redirect(`/deleted?type=task&title=${encodeURIComponent(task.title)}`);
}

/**
 * Copy a completed recurring task forward: same title, notes, project,
 * assignee, priority and steps (unticked), due one interval after the old
 * due date (or after today if it had none). The finished one stays done.
 */
async function spawnNextOccurrence(taskId: string, recurrence: Recurrence) {
  const t = await db.task.findUniqueOrThrow({ where: { id: taskId }, include: { steps: { orderBy: { order: "asc" } } } });
  const base = t.dueDate ?? new Date();
  const due = nextOccurrence(base, recurrence);
  const shift = due.getTime() - base.getTime();
  const next = await db.task.create({
    data: {
      orgId: t.orgId,
      projectId: t.projectId,
      assigneeId: t.assigneeId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: due,
      recurrence,
      status: "todo",
      steps: { create: t.steps.map((s) => ({ order: s.order, title: s.title, details: s.details, dueDate: s.dueDate ? new Date(s.dueDate.getTime() + shift) : null })) },
    },
  });
  await logActivity({ orgId: t.orgId, action: "task.created", entityType: "task", entityId: next.id, summary: `“${t.title}” repeats ${recurrenceLabel(recurrence)}; next one due ${fmtDate(due)}` });
  return next;
}
