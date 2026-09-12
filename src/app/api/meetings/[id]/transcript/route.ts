import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime, fmtTimestamp, safeJson } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/recall";

/** Download a meeting's transcript as plain text. */
export async function GET(_req: Request, ctx: RouteContext<"/api/meetings/[id]/transcript">) {
  const { id } = await ctx.params;
  const { org } = await requireOrg();
  const meeting = await db.meeting.findFirst({ where: { id, orgId: org.id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const segments = safeJson<TranscriptSegment[]>(meeting.transcript, []);
  const lines = [
    meeting.title,
    fmtDateTime(meeting.startedAt ?? meeting.scheduledAt ?? meeting.createdAt),
    "",
    ...(meeting.summary ? ["Summary", meeting.summary, ""] : []),
    "Transcript",
    ...segments.map((s) => `[${fmtTimestamp(s.startSec)}] ${s.speaker}: ${s.text}`),
  ];
  const safeName = meeting.title.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "transcript";
  return new NextResponse(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="${safeName}.txt"` },
  });
}
