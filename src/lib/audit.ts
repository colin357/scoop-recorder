import { db } from "./db";

/** Record an entry in the org's activity log. Never throws. */
export async function logActivity(input: {
  orgId: string;
  actorId?: string | null;
  action: string;
  entityType: "task" | "meeting" | "member" | "project" | "org" | "calendar";
  entityId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.activityLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (err) {
    console.error("logActivity failed", err);
  }
}
