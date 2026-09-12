import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: RouteContext<"/api/meetings/[id]/status">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await db.meeting.findFirst({ where: { id, orgId: { in: user.memberships.map((x) => x.orgId) } }, select: { status: true, updatedAt: true } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(m);
}
