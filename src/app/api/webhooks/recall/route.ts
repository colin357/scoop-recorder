import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestFromRecall } from "@/lib/pipeline";

/**
 * Recall.ai webhook. Configure in the Recall dashboard (bot status events)
 * and/or via realtime_endpoints on bot creation (transcript.done).
 * Set RECALL_WEBHOOK_SECRET and Recall will send it back so we can verify.
 */
export async function POST(req: Request) {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided = req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret");
    if (provided !== secret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { event?: string; data?: { bot?: { id?: string }; bot_id?: string; status?: { code?: string } } };
  const botId = body.data?.bot?.id ?? body.data?.bot_id;
  if (!botId) return NextResponse.json({ ok: true, ignored: "no bot id" });

  const meeting = await db.meeting.findUnique({ where: { recallBotId: botId } });
  if (!meeting) return NextResponse.json({ ok: true, ignored: "unknown bot" });

  const event = body.event ?? "";
  const code = body.data?.status?.code ?? "";

  if (event === "bot.in_call_recording" || code === "in_call_recording") {
    await db.meeting.update({ where: { id: meeting.id }, data: { status: "recording", startedAt: meeting.startedAt ?? new Date() } });
  } else if (event === "bot.joining_call" || code === "joining_call") {
    await db.meeting.update({ where: { id: meeting.id }, data: { status: "joining" } });
  } else if (event === "bot.fatal" || code === "fatal") {
    await db.meeting.update({ where: { id: meeting.id }, data: { status: "failed", error: "The recorder could not join or was removed from the call." } });
  } else if (event === "transcript.done" || event === "bot.done" || code === "done") {
    await db.meeting.update({ where: { id: meeting.id }, data: { status: "processing", endedAt: meeting.endedAt ?? new Date() } });
    // Fire and forget: Recall expects a fast 2xx.
    ingestFromRecall(meeting.id).catch((err) => console.error("ingestFromRecall failed", meeting.id, err));
  }

  return NextResponse.json({ ok: true });
}
