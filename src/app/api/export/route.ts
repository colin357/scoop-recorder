import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export const maxDuration = 120;

/** Admin-only: everything the org owns, as one JSON document. */
export async function GET() {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!user || !membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!membership.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const orgId = membership.orgId;
  const [org, members, projects, meetings, tasks, activity] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, businessDescription: true, autoRecordPolicy: true, reviewBeforeAssign: true, retentionDays: true, createdAt: true } }),
    db.membership.findMany({ where: { orgId }, select: { id: true, name: true, email: true, role: true, responsibilities: true, isAdmin: true, createdAt: true } }),
    db.project.findMany({ where: { orgId } }),
    db.meeting.findMany({ where: { orgId }, include: { attendees: true } }),
    db.task.findMany({ where: { orgId }, include: { steps: true, comments: true, messages: true } }),
    db.activityLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } }),
  ]);
  await logActivity({ orgId, actorId: membership.id, action: "org.exported", entityType: "org", entityId: orgId, summary: `${membership.name} exported all organization data` });
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), org, members, projects, meetings, tasks, activity }, null, 2);
  return new NextResponse(body, {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="scoop-export-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}
