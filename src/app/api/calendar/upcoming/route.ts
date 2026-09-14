import { NextResponse } from "next/server";
import { addMinutes, subMinutes } from "date-fns";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { syncStaleConnections } from "@/lib/calendar";

/** Meetings starting soon that still need a record/skip decision. Polled by the in-app prompt. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = user.memberships[0];
  if (!membership) return NextResponse.json({ events: [] });
  // Keep the calendar fresh while someone has the app open, between cron runs.
  await syncStaleConnections(membership.orgId).catch((e) => console.error("stale sync failed", e));
  const org = await db.organization.findUnique({ where: { id: membership.orgId }, select: { autoRecordPolicy: true } });
  if (org?.autoRecordPolicy === "off") return NextResponse.json({ events: [] });
  const events = await db.calendarEvent.findMany({
    where: {
      orgId: membership.orgId,
      decision: "undecided",
      startAt: { gte: subMinutes(new Date(), 10), lte: addMinutes(new Date(), 60) },
    },
    orderBy: { startAt: "asc" },
    take: 3,
    select: { id: true, title: true, startAt: true, platform: true },
  });
  return NextResponse.json({ events });
}
