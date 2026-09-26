"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { suggestProjectCleanup, type ProjectCleanup } from "@/lib/ai";
import { inactiveProjectIds } from "@/lib/projects";


const refresh = () => {
  for (const p of ["/projects", "/tasks", "/meetings", "/calls", "/dashboard"]) revalidatePath(p);
};

async function ownProject(orgId: string, id: string) {
  const p = await db.project.findFirst({ where: { id, orgId } });
  if (!p) throw new Error("Project not found");
  return p;
}

export async function archiveProjectAction(projectId: string) {
  const { org, membership } = await requireOrg();
  const p = await ownProject(org.id, projectId);
  await db.project.update({ where: { id: p.id }, data: { archivedAt: new Date() } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "project.archived", entityType: "project", entityId: p.id, summary: `${membership.name} archived project “${p.name}”` });
  refresh();
}

export async function restoreProjectAction(projectId: string) {
  const { org, membership } = await requireOrg();
  const p = await ownProject(org.id, projectId);
  await db.project.update({ where: { id: p.id }, data: { archivedAt: null } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "project.restored", entityType: "project", entityId: p.id, summary: `${membership.name} restored project “${p.name}”` });
  refresh();
}

export async function archiveInactiveProjectsAction() {
  const { org, membership } = await requireOrg();
  const ids = await inactiveProjectIds(org.id);
  if (!ids.length) return { archived: 0 };
  await db.project.updateMany({ where: { id: { in: ids } }, data: { archivedAt: new Date() } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "project.archived", entityType: "project", summary: `${membership.name} archived ${ids.length} inactive project${ids.length === 1 ? "" : "s"}` });
  refresh();
  return { archived: ids.length };
}

/** Fold `sourceId` into `targetId`: meetings, tasks and members move over, the source is removed. */
export async function mergeProjectsAction(sourceId: string, targetId: string) {
  const { org, membership } = await requireOrg();
  if (sourceId === targetId) return;
  const [source, target] = await Promise.all([ownProject(org.id, sourceId), ownProject(org.id, targetId)]);
  await db.$transaction(async (tx) => {
    await tx.meeting.updateMany({ where: { projectId: source.id }, data: { projectId: target.id } });
    await tx.task.updateMany({ where: { projectId: source.id }, data: { projectId: target.id } });
    const [have, moving] = await Promise.all([
      tx.projectMember.findMany({ where: { projectId: target.id }, select: { memberId: true } }),
      tx.projectMember.findMany({ where: { projectId: source.id }, select: { memberId: true } }),
    ]);
    const already = new Set(have.map((m) => m.memberId));
    const add = moving.filter((m) => !already.has(m.memberId));
    if (add.length) await tx.projectMember.createMany({ data: add.map((m) => ({ projectId: target.id, memberId: m.memberId })) });
    await tx.project.delete({ where: { id: source.id } });
    if (target.archivedAt) await tx.project.update({ where: { id: target.id }, data: { archivedAt: null } });
  });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "project.merged", entityType: "project", entityId: target.id, summary: `${membership.name} merged “${source.name}” into “${target.name}”` });
  refresh();
}

/** Ask Rocky which projects look like duplicates and which look finished. */
export async function suggestProjectCleanupAction(): Promise<ProjectCleanup> {
  const { org } = await requireOrg();
  const projects = await db.project.findMany({
    where: { orgId: org.id, archivedAt: null },
    include: {
      _count: { select: { tasks: true, meetings: true } },
      tasks: { where: { status: { notIn: ["done", "draft"] } }, select: { id: true } },
      meetings: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  if (projects.length < 2) return { merges: [], archives: [] };
  const lastTask = await db.task.groupBy({ by: ["projectId"], where: { orgId: org.id, projectId: { in: projects.map((p) => p.id) } }, _max: { updatedAt: true } });
  const lastTaskBy = new Map(lastTask.map((t) => [t.projectId, t._max.updatedAt]));
  return suggestProjectCleanup({
    businessDescription: org.businessDescription,
    projects: projects.map((p) => {
      const times = [p.meetings[0]?.createdAt, lastTaskBy.get(p.id)].filter(Boolean) as Date[];
      const last = times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null;
      return { id: p.id, name: p.name, description: p.description, tasks: p._count.tasks, openTasks: p.tasks.length, meetings: p._count.meetings, lastActivity: last ? last.toISOString().slice(0, 10) : null };
    }),
  });
}

// ---------- A meeting that fits no project ----------

async function ownMeeting(orgId: string, meetingId: string) {
  const m = await db.meeting.findFirst({ where: { id: meetingId, orgId } });
  if (!m) throw new Error("Meeting not found");
  return m;
}

/** File a meeting (and its unfiled tasks) under a project, clearing Rocky's suggestion. */
async function fileMeeting(meetingId: string, projectId: string) {
  await db.$transaction([
    db.meeting.update({ where: { id: meetingId }, data: { projectId, suggestedProjectName: null, suggestedProjectDescription: null } }),
    db.task.updateMany({ where: { meetingId, projectId: null }, data: { projectId } }),
  ]);
}

const PALETTE = ["#f15025", "#191919", "#2f6fdb", "#1f8a4c", "#8e44ad", "#d99a00", "#0e9aa7", "#c2185b"];

export async function createSuggestedProjectAction(meetingId: string) {
  const { org, membership } = await requireOrg();
  const m = await ownMeeting(org.id, meetingId);
  if (!m.suggestedProjectName) return;
  const existing = await db.project.findFirst({ where: { orgId: org.id, name: { equals: m.suggestedProjectName, mode: "insensitive" } } });
  const count = await db.project.count({ where: { orgId: org.id } });
  const project = existing
    ? await db.project.update({ where: { id: existing.id }, data: { archivedAt: null } })
    : await db.project.create({ data: { orgId: org.id, name: m.suggestedProjectName, description: m.suggestedProjectDescription, color: PALETTE[count % PALETTE.length] } });
  await fileMeeting(m.id, project.id);
  await logActivity({ orgId: org.id, actorId: membership.id, action: "project.created", entityType: "project", entityId: project.id, summary: `${membership.name} created project “${project.name}” from “${m.title}”` });
  refresh();
  revalidatePath(`/meetings/${m.id}`);
}

export async function assignMeetingProjectAction(meetingId: string, form: FormData) {
  const { org } = await requireOrg();
  const m = await ownMeeting(org.id, meetingId);
  const projectId = String(form.get("projectId") ?? "");
  if (!projectId) return;
  await ownProject(org.id, projectId);
  await fileMeeting(m.id, projectId);
  refresh();
  revalidatePath(`/meetings/${m.id}`);
}

export async function dismissProjectSuggestionAction(meetingId: string) {
  const { org } = await requireOrg();
  const m = await ownMeeting(org.id, meetingId);
  await db.meeting.update({ where: { id: m.id }, data: { suggestedProjectName: null, suggestedProjectDescription: null } });
  revalidatePath(`/meetings/${m.id}`);
}
