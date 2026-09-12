"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

async function ownedTask(taskId: string) {
  const { org } = await requireOrg();
  const task = await db.task.findFirst({ where: { id: taskId, orgId: org.id } });
  if (!task) throw new Error("Task not found");
  return { org, task };
}

export async function updateTaskAction(taskId: string, patch: {
  status?: string;
  assigneeId?: string | null;
  projectId?: string | null;
  dueDate?: string | null;
  priority?: string;
  title?: string;
  description?: string;
}) {
  await ownedTask(taskId);
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
    },
  });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
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
  await db.task.create({
    data: {
      orgId: org.id,
      title,
      description: String(form.get("description") ?? ""),
      projectId: String(form.get("projectId") ?? "") || null,
      assigneeId: String(form.get("assigneeId") ?? "") || null,
      priority: String(form.get("priority") ?? "medium"),
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  revalidatePath("/tasks");
}

export async function deleteTaskAction(taskId: string) {
  await ownedTask(taskId);
  await db.task.delete({ where: { id: taskId } });
  revalidatePath("/tasks");
}
