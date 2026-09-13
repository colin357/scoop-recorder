# Google OAuth verification: scope justification

Copy from here into the Google Cloud Console → APIs & Services → OAuth consent screen → verification form. Text is written for the reviewer; keep it factual and matching what the app actually does.

## Scopes requested

| Scope | Class | Where it's used |
|---|---|---|
| `https://www.googleapis.com/auth/calendar.readonly` | Sensitive | Calendar connection (`/api/calendar/google/*`) |
| `https://www.googleapis.com/auth/userinfo.email` | Non-sensitive | Calendar connection: label which account is connected |
| `openid`, `email`, `profile` | Non-sensitive | "Sign in with Google" |

Only `calendar.readonly` needs a justification. No restricted scopes are requested.

## App information

**App name:** Scoop

**Homepage:** https://www.scooprecorder.com

**Privacy policy:** https://www.scooprecorder.com/privacy

**Terms of service:** https://www.scooprecorder.com/terms

**App description (what the reviewer sees):**

Scoop is a meeting assistant for small teams. It records the team's Google Meet, Zoom and Microsoft Teams calls with a notetaker bot, produces a summary, and turns action items into assigned tasks with due dates and links back to the exact moment in the recording. Users connect their Google Calendar so Scoop can see which upcoming events have a video-meeting link and, with the user's permission, send the notetaker to those meetings automatically.

## Justification for `calendar.readonly`

**How the app uses this scope**

Scoop reads the user's primary Google Calendar to find upcoming events that contain a Google Meet, Zoom or Microsoft Teams link. For each such event, Scoop shows the user a "Record or skip?" prompt (or, if the user has chosen the automatic policy, schedules the recording bot to join at the start time). Without calendar access the user would have to paste every meeting link into Scoop by hand before each call, which defeats the purpose of the product.

Specifically, the app calls `GET /calendar/v3/calendars/primary/events` with `timeMin` set to now, a window of about seven days, and `singleEvents=true`. From each event it reads only: the event ID, title, start and end time, status, the attendee names and email addresses, and the conference link (from `hangoutLink`, `conferenceData.entryPoints`, `location` or `description`). Events without a video-meeting link are ignored and not stored.

**Why a narrower scope isn't sufficient**

- `calendar.events.readonly` would also work for this use case and we would accept it if the reviewer prefers; we request `calendar.readonly` because it is the scope the Calendar API documents for read-only access to events and it allows the same request with no additional data collected. We never read calendar settings, ACLs, or secondary calendars.
- `calendar.freebusy` is not sufficient because it does not return the meeting link or title, which are the two fields the feature depends on.
- `calendar.events` (read/write) is not requested. Scoop never creates, edits, or deletes events. Access is strictly read-only.

**How the data is stored and protected**

- The OAuth refresh token is encrypted at rest with an application-held key (AES-256-GCM) before being written to the database. Access tokens are refreshed on demand and not persisted beyond the current sync.
- Stored event data is limited to the fields listed above, only for events with a video link, and only for the upcoming window. Past events are pruned automatically on every sync.
- Calendar data is used solely to present upcoming meetings inside the user's own workspace and to schedule the recording bot. It is never sold, never used for advertising, never used to train AI models, and never shared with third parties other than our hosting and database providers (Vercel, Neon) acting as processors.
- The user can disconnect the calendar at any time from Settings → Calendar, which deletes the stored tokens immediately and stops all syncing. Deleting the workspace deletes all calendar data.
- The sync runs every ten minutes via a scheduled job and on demand when the user opens the calendar page.

**Who sees it**

Only the user who connected the calendar, and the members of their own Scoop workspace, see the resulting list of upcoming meetings. Workspace admins choose whether the bot asks before each meeting or joins automatically.

## Justification for `userinfo.email` (calendar connection)

Used once, at connection time, to record which Google account was connected so the user can see "Google Calendar · name@company.com" in settings and tell multiple connections apart. No other profile data is read.

## Justification for `openid`, `email`, `profile` (Sign in with Google)

Standard sign-in. The email address identifies the user's Scoop account and the display name pre-fills their profile. Nothing else from the profile is used.

## Demo video (required for sensitive scopes)

Google wants a screen recording, in English, showing the full OAuth flow from the app's real domain and how the granted data is used. Under two minutes is fine. Record these steps in order:

1. Open https://www.scooprecorder.com, sign in, and go to Settings → Calendar. Show the page that explains what connecting does.
2. Click "Connect Google Calendar". Let the Google consent screen render fully so the reviewer can read the app name, the requested scopes, and the "read-only" wording. Click Allow.
3. Land back in Scoop with the "Calendar connected" banner. Show the Upcoming meetings list populated from the calendar, with the "Record" and "Skip" buttons on each event. Point out that only events with a video link appear.
4. Show the "When a meeting with a video link shows up" policy (Record automatically / Ask me first / Off) to demonstrate user control.
5. Click Disconnect and show that the connection and the upcoming list are removed.
6. Briefly show the Privacy Policy page section "Calendar data" that states access is read-only and tokens are encrypted.

Tips that avoid a rejection:

- The consent screen must show the production client ID and the verified domain, not localhost or a Vercel preview URL.
- The scopes in the video must exactly match the scopes listed in the console. Don't request any scope the app doesn't use.
- Show the data being used for the stated purpose (the upcoming meetings list), not just the consent screen.
- Keep the app's OAuth client "User type" set to External and make sure the homepage, privacy and terms URLs all resolve on the same verified domain.

## Domain verification checklist

- [ ] `scooprecorder.com` verified in Google Search Console with the same Google account that owns the Cloud project.
- [ ] Authorized domain on the consent screen: `scooprecorder.com`.
- [ ] Authorized redirect URI: `https://www.scooprecorder.com/api/calendar/google/callback` and `https://www.scooprecorder.com/api/auth/google/callback`.
- [ ] Homepage clearly describes the product and links to the privacy policy (footer link is present).
- [ ] Privacy policy mentions Google user data, read-only calendar access, retention, and deletion (it does, section 2 "Calendar data" and section 7).
- [ ] Support email on the consent screen is a monitored inbox.

## Expected timeline

Sensitive-scope reviews usually take a few days to a week. Until approval, the consent screen shows an "unverified app" warning and the app is limited to 100 users. The warning is cosmetic for testing but customers will not click through it, so submit as early as possible.
