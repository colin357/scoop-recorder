import { db } from "./db";
import { logActivity } from "./audit";
import { processMeeting } from "./pipeline";
import { formatPhone } from "./phone-format";
import { getCall, placeCall, twilioConfigured, voiceHook } from "./twilio";
import { transcribeTwilioRecording } from "./transcribe";

/**
 * Phone calls. Two ways in:
 *  - bridge: "Call with Rocky" rings the user, they press a key, Rocky dials
 *    the contact and records both sides on separate channels.
 *  - merge: the user calls Rocky's number during a call and merges it in;
 *    Rocky recognises their verified number and records the conference.
 * Both end in the normal pipeline (transcript → summary → tasks).
 */

export function recordingNotice(orgName: string) {
  return `This call is being recorded by Scoop for ${orgName}.`;
}

export async function startBridgeCall(input: {
  orgId: string;
  user: { name: string; email: string; phone: string };
  contactPhone: string;
  contactName: string | null;
  title: string | null;
  projectId: string | null;
}) {
  const contactLabel = input.contactName || formatPhone(input.contactPhone);
  const meeting = await db.meeting.create({
    data: {
      orgId: input.orgId,
      projectId: input.projectId,
      title: input.title || `Call with ${contactLabel}`,
      platform: "phone",
      callKind: "bridge",
      phoneContact: input.contactPhone,
      status: "joining",
      scheduledAt: new Date(),
      attendees: { create: [{ name: input.user.name, email: input.user.email }, { name: contactLabel, email: null }] },
    },
  });
  try {
    const call = await placeCall({ to: input.user.phone, url: voiceHook("answer", meeting.id), statusCallback: voiceHook("status", meeting.id) });
    await db.meeting.update({ where: { id: meeting.id }, data: { callSid: call.sid } });
  } catch (err) {
    await db.meeting.update({ where: { id: meeting.id }, data: { status: "failed", error: "Couldn't place the call. Please try again." } });
    throw err;
  }
  return meeting;
}

// The Twilio errors people actually hit when a call can't ring, in plain words.
const TWILIO_ERRORS: Record<number, string> = {
  21210: "The Scoop number in TWILIO_PHONE_NUMBER isn't a number on the Twilio account.",
  21211: "That isn't a valid phone number.",
  21212: "The Scoop number in TWILIO_PHONE_NUMBER isn't in the right format (it should look like +12395550100).",
  21215: "Twilio isn't allowed to call that country yet. Turn it on under Voice → Settings → Geo permissions.",
  21219: "The Twilio account is still a trial, so it can only call numbers verified in Twilio. Upgrade the account to call anyone.",
  13225: "Twilio blocked the call as possible fraud. Check Voice → Settings → Geo permissions.",
  13227: "Twilio isn't allowed to call that country yet. Turn it on under Voice → Settings → Geo permissions.",
  32021: "The Twilio account doesn't have enough balance to place calls.",
};

export function explainTwilioError(code?: number | null) {
  return (code && TWILIO_ERRORS[code]) || "Details are in Twilio under Monitor → Logs → Calls.";
}

export async function failCall(meetingId: string, error: string) {
  await db.meeting.updateMany({ where: { id: meetingId, status: { in: ["joining", "recording"] } }, data: { status: "failed", error, endedAt: new Date() } });
}

/** Recording is ready: transcribe it, then run the normal meeting pipeline. */
export async function finishPhoneCall(meetingId: string, channels: number) {
  const m = await db.meeting.findUniqueOrThrow({ where: { id: meetingId }, include: { attendees: { orderBy: { id: "asc" } } } });
  if (!m.recordingUrl) return;
  try {
    // Bridge calls record the user (parent leg) on channel 1 and the contact on channel 2.
    const speakerNames = m.callKind === "bridge" ? m.attendees.map((a) => a.name) : [];
    const transcript = await transcribeTwilioRecording({ mediaUrl: m.recordingUrl, channels, speakerNames });
    await db.meeting.update({ where: { id: meetingId }, data: { transcript: JSON.stringify(transcript) } });
  } catch (err) {
    console.error("phone transcription failed", meetingId, err);
    await db.meeting.update({ where: { id: meetingId }, data: { status: "failed", error: err instanceof Error ? err.message : "Transcription failed." } });
    return;
  }
  await processMeeting(meetingId);
  await logActivity({ orgId: m.orgId, action: "meeting.processed", entityType: "meeting", entityId: meetingId, summary: `Phone call “${m.title}” transcribed` });
}

/**
 * Safety net for calls that ended without a recording callback (for example the
 * user hung up before merging Rocky in). Runs from the calendar cron.
 */
export async function sweepStalePhoneCalls() {
  if (!twilioConfigured()) return 0;
  const stale = await db.meeting.findMany({
    where: { platform: "phone", status: { in: ["joining", "recording"] }, recordingUrl: null, callSid: { not: null }, updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    select: { id: true, callSid: true },
  });
  let failed = 0;
  for (const m of stale) {
    try {
      const call = await getCall(m.callSid!);
      const ended = call.end_time ? new Date(call.end_time).getTime() : null;
      if (["completed", "busy", "no-answer", "failed", "canceled"].includes(call.status) && (!ended || Date.now() - ended > 10 * 60_000)) {
        await failCall(m.id, "The call ended before anything was recorded.");
        failed++;
      }
    } catch (err) {
      console.error("sweep phone call", m.id, err);
    }
  }
  return failed;
}
