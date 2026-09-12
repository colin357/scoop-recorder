import { NextResponse } from "next/server";
import { syncAllConnections } from "@/lib/calendar";

export const maxDuration = 300;

/** Vercel Cron target (see vercel.json). Vercel sends Authorization: Bearer $CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllConnections();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}
