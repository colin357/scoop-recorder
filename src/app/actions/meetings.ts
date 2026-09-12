"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { createBot, parsePlainTranscript, recallConfigured } from "@/lib/recall";
import { detectPlatform } from "@/lib/utils";
import { ingestFromRecall, processMeeting } from "@/lib/pipeline";

export type MeetingFormState = { error?: string };

/** Send the recording bot to a meeting URL (now or at a scheduled time). */
export async function scheduleBotAction(_: MeetingFormState, form: FormData): Promise<MeetingFormState> {
  const { org } = await requireOrg();
  const meetingUrl = String(form.get("meetingUrl") ?? "").trim();
  const title = String(form.get("title") ?? "").trim() || "Untitled meeting";
  const projectId = String(form.get("projectId") ?? "") || null;
  const joinAtRaw = String(form.get("joinAt") ?? "");
  const joinAt = joinAtRaw ? new Date(joinAtRaw) : undefined;

  if (!/^https?:\/\//.test(meetingUrl)) return { error: "Paste a valid meeting link." };
  if (!recallConfigured()) return { error: "Recording bot is not configured (RECALL_API_KEY missing). Use the transcript upload below to test." };

  let botId: string;
  try {
    const bot = await createBot({ meetingUrl, botName: `${org.name} Notetaker`, joinAt });
    botId = bot.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create bot." };
  }

  const meeting = await db.meeting.create({
    data: {
      orgId: org.id,
      projectId,
      title,
      platform: detectPlatform(meetingUrl),
      meetingUrl,
      scheduledAt: joinAt ?? new Date(),
      status: joinAt ? "scheduled" : "joining",
      recallBotId: botId,
    },
  });
  redirect(`/meetings/${meeting.id}`);
}

/** Dev/test path and manual path: paste a transcript, get the full pipeline. */
export async function importTranscriptAction(_: MeetingFormState, form: FormData): Promise<MeetingFormState> {
  const { org } = await requireOrg();
  const title = String(form.get("title") ?? "").trim() || "Imported meeting";
  const raw = String(form.get("transcript") ?? "");
  const projectId = String(form.get("projectId") ?? "") || null;
  const recordingUrl = String(form.get("recordingUrl") ?? "").trim() || null;
  const platform = String(form.get("platform") ?? "other");
  const segments = parsePlainTranscript(raw);
  if (segments.length < 2) return { error: "Paste a transcript with at least a couple of lines like “Alice: …”." };

  const meeting = await db.meeting.create({
    data: {
      orgId: org.id,
      projectId,
      title,
      platform,
      recordingUrl,
      startedAt: new Date(),
      endedAt: new Date(),
      status: "processing",
      transcript: JSON.stringify(segments),
    },
  });
  try {
    await processMeeting(meeting.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Analysis failed." };
  }
  redirect(`/meetings/${meeting.id}`);
}

export async function reprocessMeetingAction(meetingId: string) {
  const { org } = await requireOrg();
  const meeting = await db.meeting.findFirst({ where: { id: meetingId, orgId: org.id } });
  if (!meeting) throw new Error("Not found");
  if (meeting.transcript) await processMeeting(meetingId);
  else if (meeting.recallBotId) await ingestFromRecall(meetingId);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function deleteMeetingAction(meetingId: string) {
  const { org } = await requireOrg();
  await db.meeting.deleteMany({ where: { id: meetingId, orgId: org.id } });
  redirect("/meetings");
}
