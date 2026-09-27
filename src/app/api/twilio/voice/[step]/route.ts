import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { phoneAccess, recordingAllowed } from "@/lib/billing";
import { attr, readTwilioWebhook, say, scoopNumber, twiml, voiceHook } from "@/lib/twilio";
import { failCall, finishPhoneCall, recordingNotice } from "@/lib/phone";

export const maxDuration = 300;

const HANG_UP = "<Hangup/>";

/**
 * All Twilio voice webhooks. Steps for "Call with Rocky" (bridge):
 *   answer → (user presses a key) connect → announce (contact answers) → dial-result → recording
 * plus status (the user's leg ended). Merge-in calls hit `inbound`, then `recording`.
 */
export async function POST(req: Request, { params }: RouteContext<"/api/twilio/voice/[step]">) {
  const { step } = await params;
  const p = await readTwilioWebhook(req);
  if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const meetingId = new URL(req.url).searchParams.get("m");
  const meeting = meetingId ? await db.meeting.findUnique({ where: { id: meetingId }, include: { org: { select: { name: true } }, attendees: { orderBy: { id: "asc" } } } }) : null;
  const contactName = meeting?.attendees[1]?.name ?? "your contact";

  switch (step) {
    // The user picked up. Ask for a key press so voicemail never triggers the call.
    case "answer": {
      if (!meeting || meeting.status !== "joining") return twiml(say("Sorry, this call is no longer available. Bye for now.") + HANG_UP);
      return twiml(
        `<Gather numDigits="1" timeout="10" action="${attr(voiceHook("connect", meeting.id))}">` +
          say(`G'day, it's Rocky from Scoop. Press any key to call ${contactName}. The call will be recorded.`) +
        "</Gather>" +
        say("I didn't hear a key press, so I won't place the call. Bye for now.") + HANG_UP,
      );
    }

    // Key pressed: dial the contact, showing the user's verified number, recording each side separately.
    case "connect": {
      if (!meeting || meeting.status !== "joining" || !meeting.phoneContact) return twiml(say("Sorry, this call is no longer available.") + HANG_UP);
      const callerId = p.To || scoopNumber() || "";
      return twiml(
        say("Calling now.") +
        `<Dial callerId="${attr(callerId)}" timeout="30" record="record-from-answer-dual"` +
          ` recordingStatusCallback="${attr(voiceHook("recording", meeting.id))}" recordingStatusCallbackEvent="completed"` +
          ` action="${attr(voiceHook("dial-result", meeting.id))}">` +
          `<Number url="${attr(voiceHook("announce", meeting.id))}">${attr(meeting.phoneContact)}</Number>` +
        "</Dial>",
      );
    }

    // The contact answered: tell them the call is recorded before connecting them.
    case "announce": {
      if (meeting) await db.meeting.update({ where: { id: meeting.id }, data: { status: "recording", startedAt: meeting.startedAt ?? new Date() } });
      return twiml(say(recordingNotice(meeting?.org.name ?? "Scoop")));
    }

    case "dial-result": {
      const status = p.DialCallStatus;
      if (meeting && status && status !== "completed" && status !== "answered") {
        const reason = status === "busy" ? `${contactName}'s line was busy.` : status === "no-answer" ? `${contactName} didn't answer.` : "The call couldn't be connected.";
        await failCall(meeting.id, reason);
        return twiml(say(`${reason} I've cancelled the recording. Bye for now.`) + HANG_UP);
      }
      return twiml(HANG_UP);
    }

    // The user's own leg finished. Only matters if the call never connected.
    case "status": {
      if (meeting && meeting.status === "joining") {
        const s = p.CallStatus;
        await failCall(meeting.id, ["busy", "no-answer", "failed", "canceled"].includes(s) ? "You didn't pick up, so the call wasn't placed." : "The call ended before it connected.");
      }
      return new Response(null, { status: 204 });
    }

    // Twilio finished the recording: store it, then transcribe and summarise after responding.
    case "recording": {
      if (!meeting || p.RecordingStatus !== "completed" || !p.RecordingUrl) return new Response(null, { status: 204 });
      const channels = Number(p.RecordingChannels ?? "1") || 1;
      await db.meeting.update({
        where: { id: meeting.id },
        data: {
          recordingUrl: `${p.RecordingUrl}.mp3`,
          twilioRecordingSid: p.RecordingSid ?? null,
          durationSec: Number(p.RecordingDuration ?? "0") || null,
          startedAt: meeting.startedAt ?? new Date(),
          endedAt: new Date(),
          status: "processing",
          error: null,
        },
      });
      after(() => finishPhoneCall(meeting.id, channels).catch((e) => console.error("finishPhoneCall", meeting.id, e)));
      return new Response(null, { status: 204 });
    }

    // Someone called Rocky's number, normally to merge Rocky into a call they are on.
    case "inbound": {
      const user = p.From ? await db.user.findFirst({ where: { phone: p.From, phoneVerifiedAt: { not: null } }, include: { memberships: { include: { org: true }, orderBy: { createdAt: "asc" } } } }) : null;
      const membership = user?.memberships[0];
      if (!user || !membership) {
        return twiml(say("G'day, it's Rocky from Scoop. I don't recognise this number. Add and verify your phone in Scoop under Settings, then Profile, and call again.") + HANG_UP);
      }
      if (!phoneAccess(membership.org).ok) return twiml(say("Sorry, phone calls aren't turned on for your workspace. An admin can add them in Scoop under Settings, then Billing.") + HANG_UP);
      const gate = await recordingAllowed(membership.org);
      if (!gate.ok) return twiml(say("Sorry, recording is paused for your workspace. Check billing in Scoop.") + HANG_UP);
      const m = await db.meeting.create({
        data: {
          orgId: membership.orgId,
          title: "Phone call",
          platform: "phone",
          callKind: "merge",
          callSid: p.CallSid ?? null,
          status: "recording",
          startedAt: new Date(),
          scheduledAt: new Date(),
          attendees: { create: [{ name: user.name, email: user.email }] },
        },
      });
      return twiml(
        say("G'day, it's Rocky. Merge the calls now and I'll start recording.") +
        '<Pause length="7"/>' +
        say(recordingNotice(membership.org.name)) +
        "<Dial>" +
          `<Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="" record="record-from-start"` +
          ` recordingStatusCallback="${attr(voiceHook("recording", m.id))}" recordingStatusCallbackEvent="completed">scoop-${m.id}</Conference>` +
        "</Dial>",
      );
    }
  }
  return NextResponse.json({ error: "Unknown step" }, { status: 404 });
}
