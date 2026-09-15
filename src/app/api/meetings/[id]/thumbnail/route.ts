import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const MAX_BYTES = 80_000;

/** Store a JPEG data URL captured in the browser as the meeting's thumbnail. First writer wins. */
export async function POST(req: Request, { params }: RouteContext<"/api/meetings/[id]/thumbnail">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { dataUrl?: unknown } | null;
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > MAX_BYTES) {
    return NextResponse.json({ error: "Expected a small JPEG data URL" }, { status: 400 });
  }
  const updated = await db.meeting.updateMany({ where: { id, orgId: { in: user.memberships.map((x) => x.orgId) }, thumbnail: null }, data: { thumbnail: dataUrl } });
  return NextResponse.json({ ok: true, stored: updated.count > 0 });
}
