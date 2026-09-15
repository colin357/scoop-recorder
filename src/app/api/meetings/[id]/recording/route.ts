import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBot, recallConfigured, recordingUrlFromBot } from "@/lib/recall";

/**
 * Same-origin proxy for a meeting's recording, forwarding Range requests, so
 * the browser can read frames into a canvas (a cross-origin video taints it).
 * Used for thumbnail capture; playback still streams from the stored URL.
 * If the stored download link has expired, a fresh one is fetched from Recall.
 */
export async function GET(req: Request, { params }: RouteContext<"/api/meetings/[id]/recording">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await db.meeting.findFirst({ where: { id, orgId: { in: user.memberships.map((x) => x.orgId) } }, select: { recordingUrl: true, recallBotId: true } });
  if (!m?.recordingUrl) return NextResponse.json({ error: "No recording" }, { status: 404 });

  const range = req.headers.get("range");
  const upstream = async (url: string) => fetch(url, { headers: range ? { Range: range } : {}, cache: "no-store" });
  let res = await upstream(m.recordingUrl);
  if ((res.status === 403 || res.status === 404) && m.recallBotId && recallConfigured()) {
    const fresh = recordingUrlFromBot(await getBot(m.recallBotId));
    if (fresh && fresh !== m.recordingUrl) {
      await db.meeting.update({ where: { id }, data: { recordingUrl: fresh } });
      res = await upstream(fresh);
    }
  }
  if (!res.ok && res.status !== 206) return NextResponse.json({ error: "Recording unavailable" }, { status: 502 });

  const headers = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("cache-control", "private, max-age=3600");
  return new Response(res.body, { status: res.status, headers });
}
