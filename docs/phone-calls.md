# Phone calls

Rocky can record phone calls two ways:

- **Call with Rocky** (Record a meeting page). Rocky rings the user's verified mobile. They answer and press any key, and Rocky dials the other person, showing the user's own number as caller ID. The contact hears a recording notice before they are connected. Each side is recorded on its own channel, so the transcript knows exactly who said what.
- **Merge Rocky in** (any call already in progress). The user taps Add call, dials Rocky's number, then Merge. Rocky recognises their verified number, waits a few seconds for the merge, announces the recording, and records.

Both paths end in the normal pipeline: transcript, summary, tasks, notifications.

## Setup (one time)

1. **Twilio account.** Upgrade from trial (trial accounts can only call verified numbers and play a trial message).
2. **Buy one US local number** with Voice capability.
3. On that number, under *Voice Configuration → A call comes in*, set **Webhook**, `https://www.scooprecorder.com/api/twilio/voice/inbound`, **HTTP POST**. Use the `www` address exactly; Twilio signs the URL and the app checks it.
4. **Deepgram account** and an API key (Member role is enough).
5. In Vercel → Project → Settings → Environment Variables (Production), add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` in E.164, for example `+12395550100`
   - `DEEPGRAM_API_KEY`
6. Redeploy. The phone card appears on *Record a meeting* and a *Your phone* section appears in *Settings → Profile* once these are set.

Each user verifies their mobile once in *Settings → Profile*: the app shows a six-digit code, Twilio calls the phone, and the user types the code. This registers the number as a Twilio verified caller ID (so it can be shown to people Rocky calls) and proves the user owns the phone Rocky will ring.

## Webhooks

All call events go to `POST /api/twilio/voice/[step]`, authenticated with Twilio's `X-Twilio-Signature`:

| Step | When |
|---|---|
| `answer` | The user picks up a Call with Rocky call. Asks for a key press so voicemail never triggers the call. |
| `connect` | Key pressed. Dials the contact with dual-channel recording. |
| `announce` | The contact answered. Plays the recording notice to them, marks the meeting as recording. |
| `dial-result` | The contact's leg ended. Marks busy / no answer as failed. |
| `status` | The user's leg ended. Marks calls that never connected as failed. |
| `recording` | Twilio finished the recording. Stored, then transcribed by Deepgram and run through the pipeline. |
| `inbound` | Someone called Rocky's number (merge-in). |

The calendar cron also closes phone meetings whose call ended without a recording.

## Recordings and retention

Recordings stay in Twilio and are streamed to members through `/api/meetings/[id]/recording`. They are deleted from Twilio when the meeting is deleted, when the workspace is deleted, or by the nightly retention job, the same as video recordings at Recall.

## Cost (list prices, September 2026)

| Item | Price |
|---|---|
| Phone number | $1.15 / month |
| Outbound call leg | $0.014 / min |
| Inbound call leg | $0.0085 / min |
| Conference participant (merge-in) | $0.0018 / min |
| Recording | $0.0025 / min |
| Recording storage | $0.0005 / min / month |
| Deepgram Nova-3 | $0.0043 / min per channel |
| Rocky's voice (Polly) | about $0.001 per call |

Call with Rocky ≈ $0.039 / min (two legs, two-channel transcription), about $2.35 / hour. Merge-in ≈ $0.017 / min, about $1.03 / hour.

## What customers pay

Phone calls are a workspace add-on: $25 / month ($240 / year on annual plans) with 6 hours of calls included, then $3.50 per extra hour, invoiced on the 1st of the next month by `/api/cron/bill-overage`. Calls are included in the free trial (they count toward its 5 recording hours) and for complimentary workspaces. Admins turn the add-on on and off under Settings → Billing; the Calls tab offers it when it's off.

## Verifying a user's phone

Every number is confirmed by a phone call before Scoop uses it:

- **New to the Twilio account:** Twilio's caller-ID verification. Scoop shows a 6-digit code and Twilio rings the phone; the user types the code on the keypad. This also lets calls show the user's own number as caller ID.
- **Already a verified caller ID on the account** (for example the number you used to open the Twilio account): Twilio won't verify it twice, so Rocky rings the number and reads out a 6-digit code, which the user types into Scoop. Codes expire after 10 minutes and allow 5 tries.

## When a call fails

If Twilio can't ring the user, the call page shows Twilio's error code with a plain-English reason, and the function log has a `phone call failed` line with the call SID. Common causes:

| Error | Meaning |
|---|---|
| 21219 | Trial account: it can only call numbers verified in Twilio. Upgrade the account. |
| 21215 / 13227 | Geo permissions: allow the destination country under Voice → Settings → Geo permissions. |
| 21210 / 21212 | `TWILIO_PHONE_NUMBER` isn't a number on the account, or isn't in +1XXXXXXXXXX format. |
| 32021 | Not enough Twilio balance. |

Full details for any call are in the Twilio console under Monitor → Logs → Calls.
