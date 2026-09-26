import { NextResponse } from "next/server";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { deleteMeetingMedia } from "@/lib/media";
import { logActivity } from "@/lib/audit";

export const maxDuration = 300;

/** Daily: purge recordings and transcripts older than each org's retentionDays. Summaries and tasks are kept. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgs = await db.organization.findMany({ where: { retentionDays: { not: null } }, select: { id: true, retentionDays: true } });
  let purged = 0;
  for (const org of orgs) {
    const cutoff = subDays(new Date(), org.retentionDays!);
    const meetings = await db.meeting.findMany({
      where: { orgId: org.id, recordingDeletedAt: null, createdAt: { lt: cutoff }, OR: [{ recordingUrl: { not: null } }, { transcript: { not: null } }] },
      select: { id: true, recallBotId: true, twilioRecordingSid: true, title: true },
    });
    for (const m of meetings) {
      await deleteMeetingMedia(m);
      await db.meeting.update({ where: { id: m.id }, data: { recordingUrl: null, transcript: null, recordingDeletedAt: new Date() } });
      await logActivity({ orgId: org.id, action: "meeting.media_purged", entityType: "meeting", entityId: m.id, summary: `Recording and transcript for “${m.title}” deleted after ${org.retentionDays} days` });
      purged++;
    }
  }
  return NextResponse.json({ ok: true, orgs: orgs.length, purged });
}
