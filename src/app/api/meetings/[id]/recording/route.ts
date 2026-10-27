import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBot, recallConfigured, recordingUrlFromBot } from "@/lib/recall";
import { fetchTwilioMedia, isTwilioMediaUrl } from "@/lib/twilio";

/**
 * Same-origin proxy for a meeting's recording, forwarding Range requests, so
 * the browser can read frames into a canvas (a cross-origin video taints it).
 * Used for thumbnail capture. With `?play`, video recordings instead redirect to
 * the (refreshed) download link so playback streams straight from the source.
 * If the stored download link has expired, a fresh one is fetched from Recall.
 */
export async function GET(req: Request, { params }: RouteContext<"/api/meetings/[id]/recording">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await db.meeting.findFirst({ where: { id, orgId: { in: user.memberships.map((x) => x.orgId) } }, select: { recordingUrl: true, recallBotId: true } });
  if (!m?.recordingUrl) return NextResponse.json({ error: "No recording" }, { status: 404 });

  // Playback redirects to a download link instead of streaming through this function.
  // Recall links expire after a few hours, so ask Recall for a fresh one each time.
  // Phone recordings live behind Twilio auth, so they are always played through the proxy below.
  if (new URL(req.url).searchParams.has("play") && !isTwilioMediaUrl(m.recordingUrl)) {
    let url: string | null = m.recordingUrl;
    if (m.recallBotId && recallConfigured()) {
      try {
        url = recordingUrlFromBot(await getBot(m.recallBotId));
      } catch (err) {
        console.error(`recording ${id}: Recall lookup failed`, err);
        return NextResponse.json({ error: "Recording unavailable" }, { status: 502 });
      }
      if (!url) return NextResponse.json({ error: "Recording no longer available" }, { status: 404 });
      if (url !== m.recordingUrl) await db.meeting.update({ where: { id }, data: { recordingUrl: url } });
    }
    return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "no-store" } });
  }

  const range = req.headers.get("range");
  const upstream = async (url: string) => (isTwilioMediaUrl(url) ? fetchTwilioMedia(url, range) : fetch(url, { headers: range ? { Range: range } : {}, cache: "no-store" }));
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
