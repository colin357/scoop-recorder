import { db } from "./db";

export type PickerProject = { id: string; name: string; color: string; lastUsed: string | null };

/**
 * Active (not archived) projects, most recently used first, where "used" is
 * the latest meeting or task activity. Pickers show the first few as "Recent".
 */
export async function activeProjectsByRecency(orgId: string): Promise<PickerProject[]> {
  const [projects, meetingUse, taskUse] = await Promise.all([
    db.project.findMany({ where: { orgId, archivedAt: null }, select: { id: true, name: true, color: true, createdAt: true } }),
    db.meeting.groupBy({ by: ["projectId"], where: { orgId, projectId: { not: null } }, _max: { createdAt: true } }),
    db.task.groupBy({ by: ["projectId"], where: { orgId, projectId: { not: null } }, _max: { updatedAt: true } }),
  ]);
  const last = new Map<string, number>();
  const bump = (id: string | null, d: Date | null | undefined) => { if (id && d) last.set(id, Math.max(last.get(id) ?? 0, d.getTime())); };
  for (const m of meetingUse) bump(m.projectId, m._max.createdAt);
  for (const t of taskUse) bump(t.projectId, t._max.updatedAt);
  return projects
    .map((p) => ({ id: p.id, name: p.name, color: p.color, lastUsed: last.has(p.id) ? new Date(last.get(p.id)!).toISOString() : null, _sort: last.get(p.id) ?? p.createdAt.getTime() }))
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort: _unused, ...p }) => p); // eslint-disable-line @typescript-eslint/no-unused-vars
}

/** Projects with nothing happening for this long (and nothing open) are offered for archiving. */
export const INACTIVE_DAYS = 30;

/** Active projects with no meetings or task changes in the last INACTIVE_DAYS and nothing open. */
export async function inactiveProjectIds(orgId: string) {
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86400_000);
  const rows = await db.project.findMany({
    where: {
      orgId,
      archivedAt: null,
      createdAt: { lt: cutoff },
      meetings: { none: { createdAt: { gte: cutoff } } },
      tasks: { none: { OR: [{ updatedAt: { gte: cutoff } }, { status: { notIn: ["done", "draft"] } }] } },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

