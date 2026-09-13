/**
 * Calendar integrations (Google Calendar, Microsoft 365) and the auto-record scheduler.
 *
 * Flow: user connects a calendar → cron syncs upcoming events with video links into
 * CalendarEvent → policy decides (auto / ask / off) → for "record" events we create a
 * Recall bot scheduled to join at the start time and link it to a Meeting.
 */
import { addDays, subMinutes } from "date-fns";
import { db } from "./db";
import { decrypt, encrypt } from "./crypto";
import { consentNotice, createBot, recallConfigured, removeBot } from "./recall";
import { recordingAllowed } from "./billing";
import { detectPlatform } from "./utils";
import { appUrl } from "./urls";

export type CalendarProvider = "google" | "microsoft";

type NormalizedEvent = {
  externalId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  meetingUrl: string;
  organizerEmail: string | null;
  attendees: { name: string | undefined; email: string | undefined }[];
};

const SYNC_WINDOW_DAYS = 14;

export function calendarProviderConfigured(provider: CalendarProvider) {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

// ---------- OAuth ----------

export function authorizeUrl(provider: CalendarProvider, state: string) {
  const redirect = `${appUrl()}/api/calendar/${provider}/callback`;
  if (provider === "google") {
    const p = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirect,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }
  const p = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: "code",
    scope: "offline_access User.Read Calendars.Read",
    response_mode: "query",
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${p}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(provider: CalendarProvider, body: Record<string, string>): Promise<TokenResponse> {
  const url = provider === "google" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const creds =
    provider === "google"
      ? { client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET! }
      : { client_id: process.env.MICROSOFT_CLIENT_ID!, client_secret: process.env.MICROSOFT_CLIENT_SECRET! };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...creds, ...body }),
  });
  if (!res.ok) throw new Error(`${provider} token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export async function exchangeCode(provider: CalendarProvider, code: string) {
  const redirect = `${appUrl()}/api/calendar/${provider}/callback`;
  const tok = await tokenRequest(provider, { grant_type: "authorization_code", code, redirect_uri: redirect });
  if (!tok.refresh_token) throw new Error("No refresh token returned. Revoke the app's access and reconnect.");
  const email = await fetchAccountEmail(provider, tok.access_token);
  return { ...tok, email };
}

async function fetchAccountEmail(provider: CalendarProvider, accessToken: string) {
  const url = provider === "google" ? "https://www.googleapis.com/oauth2/v2/userinfo" : "https://graph.microsoft.com/v1.0/me";
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Could not read account email: ${res.status}`);
  const j = (await res.json()) as { email?: string; mail?: string; userPrincipalName?: string };
  return (j.email ?? j.mail ?? j.userPrincipalName ?? "unknown").toLowerCase();
}

async function freshAccessToken(connId: string) {
  const conn = await db.calendarConnection.findUniqueOrThrow({ where: { id: connId } });
  if (conn.expiresAt.getTime() - Date.now() > 60_000) return decrypt(conn.accessToken);
  const tok = await tokenRequest(conn.provider as CalendarProvider, { grant_type: "refresh_token", refresh_token: decrypt(conn.refreshToken) });
  await db.calendarConnection.update({
    where: { id: connId },
    data: {
      accessToken: encrypt(tok.access_token),
      refreshToken: tok.refresh_token ? encrypt(tok.refresh_token) : conn.refreshToken,
      expiresAt: new Date(Date.now() + tok.expires_in * 1000),
    },
  });
  return tok.access_token;
}

// ---------- Event listing ----------

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

/** Find a Meet / Zoom / Teams link in any of the given strings. */
export function findMeetingUrl(...candidates: (string | null | undefined)[]) {
  for (const c of candidates) {
    if (!c) continue;
    for (const url of c.match(URL_RE) ?? []) {
      if (detectPlatform(url) !== "other") return url.replace(/[.,;]+$/, "");
    }
  }
  return null;
}

async function listGoogleEvents(accessToken: string, from: Date, to: Date): Promise<NormalizedEvent[]> {
  const p = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google Calendar list failed: ${res.status} ${await res.text()}`);
  type GEvent = {
    id: string; summary?: string; status?: string; hangoutLink?: string; location?: string; description?: string;
    start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string };
    organizer?: { email?: string }; attendees?: { email?: string; displayName?: string }[];
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  };
  const j = (await res.json()) as { items?: GEvent[] };
  return (j.items ?? [])
    .filter((e) => e.status !== "cancelled" && e.start?.dateTime && e.end?.dateTime)
    .map((e): NormalizedEvent | null => {
      const video = e.conferenceData?.entryPoints?.find((x) => x.entryPointType === "video")?.uri;
      const meetingUrl = findMeetingUrl(e.hangoutLink, video, e.location, e.description);
      return meetingUrl
        ? {
            externalId: e.id,
            title: e.summary ?? "Untitled meeting",
            startAt: new Date(e.start!.dateTime!),
            endAt: new Date(e.end!.dateTime!),
            meetingUrl,
            organizerEmail: e.organizer?.email ?? null,
            attendees: (e.attendees ?? []).map((a) => ({ name: a.displayName, email: a.email })),
          }
        : null;
    })
    .filter((e): e is NormalizedEvent => e !== null);
}

async function listMicrosoftEvents(accessToken: string, from: Date, to: Date): Promise<NormalizedEvent[]> {
  const p = new URLSearchParams({
    startDateTime: from.toISOString(),
    endDateTime: to.toISOString(),
    $top: "100",
    $orderby: "start/dateTime",
    $select: "id,subject,start,end,isCancelled,onlineMeeting,location,bodyPreview,organizer,attendees,webLink",
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${p}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
  });
  if (!res.ok) throw new Error(`Microsoft calendar list failed: ${res.status} ${await res.text()}`);
  type MEvent = {
    id: string; subject?: string; isCancelled?: boolean; onlineMeeting?: { joinUrl?: string };
    location?: { displayName?: string }; bodyPreview?: string;
    start: { dateTime: string }; end: { dateTime: string };
    organizer?: { emailAddress?: { address?: string } };
    attendees?: { emailAddress?: { address?: string; name?: string } }[];
  };
  const j = (await res.json()) as { value?: MEvent[] };
  return (j.value ?? [])
    .filter((e) => !e.isCancelled)
    .map((e): NormalizedEvent | null => {
      const meetingUrl = findMeetingUrl(e.onlineMeeting?.joinUrl, e.location?.displayName, e.bodyPreview);
      return meetingUrl
        ? {
            externalId: e.id,
            title: e.subject ?? "Untitled meeting",
            startAt: new Date(e.start.dateTime + "Z"),
            endAt: new Date(e.end.dateTime + "Z"),
            meetingUrl,
            organizerEmail: e.organizer?.emailAddress?.address ?? null,
            attendees: (e.attendees ?? []).map((a) => ({ name: a.emailAddress?.name, email: a.emailAddress?.address })),
          }
        : null;
    })
    .filter((e): e is NormalizedEvent => e !== null);
}

// ---------- Sync & scheduling ----------

export async function syncConnection(connId: string) {
  const conn = await db.calendarConnection.findUniqueOrThrow({ where: { id: connId }, include: { org: true } });
  try {
    const token = await freshAccessToken(connId);
    const from = subMinutes(new Date(), 30);
    const to = addDays(new Date(), SYNC_WINDOW_DAYS);
    const events = conn.provider === "google" ? await listGoogleEvents(token, from, to) : await listMicrosoftEvents(token, from, to);

    const seen = new Set<string>();
    for (const e of events) {
      seen.add(e.externalId);
      const existing = await db.calendarEvent.findUnique({ where: { connectionId_externalId: { connectionId: connId, externalId: e.externalId } } });
      const base = {
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        meetingUrl: e.meetingUrl,
        platform: detectPlatform(e.meetingUrl),
        organizerEmail: e.organizerEmail,
        attendees: JSON.stringify(e.attendees),
      };
      if (existing) {
        await db.calendarEvent.update({ where: { id: existing.id }, data: base });
      } else {
        await db.calendarEvent.create({
          data: {
            ...base,
            orgId: conn.orgId,
            connectionId: connId,
            externalId: e.externalId,
            decision: conn.org.autoRecordPolicy === "auto" ? "record" : "undecided",
          },
        });
      }
    }
    // Events that disappeared from the calendar (deleted / declined): drop them and cancel bots.
    const gone = await db.calendarEvent.findMany({ where: { connectionId: connId, startAt: { gte: from }, externalId: { notIn: [...seen] } } });
    for (const g of gone) await cancelEventRecording(g.id);
    await db.calendarEvent.deleteMany({ where: { id: { in: gone.map((g) => g.id) } } });
    // Ended events that never became a recording are calendar data we no longer need.
    await db.calendarEvent.deleteMany({ where: { connectionId: connId, meetingId: null, endAt: { lt: subMinutes(new Date(), 60) } } });

    await db.calendarConnection.update({ where: { id: connId }, data: { syncedAt: new Date(), syncError: null } });
  } catch (err) {
    await db.calendarConnection.update({ where: { id: connId }, data: { syncError: err instanceof Error ? err.message : String(err) } });
    throw err;
  }
  await scheduleDecidedEvents(conn.orgId);
}

/** Create bots for events marked "record" that do not have one yet. */
export async function scheduleDecidedEvents(orgId: string) {
  if (!recallConfigured()) return;
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!(await recordingAllowed(org)).ok) return; // trial allowance used up or subscription ended
  const pending = await db.calendarEvent.findMany({
    where: { orgId, decision: "record", meetingId: null, endAt: { gt: new Date() } },
  });
  for (const ev of pending) {
    const joinAt = ev.startAt > new Date() ? ev.startAt : undefined;
    try {
      const bot = await createBot({ meetingUrl: ev.meetingUrl, botName: org.botName ?? `${org.name} Notetaker`, joinAt, notice: org.recordingNotice ? consentNotice(org.name, org.botName) : null });
      const meeting = await db.meeting.create({
        data: {
          orgId,
          title: ev.title,
          platform: ev.platform,
          meetingUrl: ev.meetingUrl,
          scheduledAt: ev.startAt,
          status: joinAt ? "scheduled" : "joining",
          recallBotId: bot.id,
          attendees: {
            create: (JSON.parse(ev.attendees) as { name?: string; email?: string }[])
              .filter((a) => a.name || a.email)
              .map((a) => ({ name: a.name ?? a.email ?? "Guest", email: a.email ?? null })),
          },
        },
      });
      await db.calendarEvent.update({ where: { id: ev.id }, data: { meetingId: meeting.id } });
    } catch (err) {
      console.error("Failed to schedule bot for event", ev.id, err);
    }
  }
}

export async function cancelEventRecording(eventId: string) {
  const ev = await db.calendarEvent.findUnique({ where: { id: eventId }, include: { meeting: true } });
  if (!ev?.meeting) return;
  if (ev.meeting.recallBotId && ["scheduled", "joining"].includes(ev.meeting.status)) {
    try {
      await removeBot(ev.meeting.recallBotId);
    } catch (err) {
      console.error("removeBot failed", err);
    }
    await db.meeting.delete({ where: { id: ev.meeting.id } });
  }
}

export async function setEventDecision(eventId: string, decision: "record" | "skip") {
  const ev = await db.calendarEvent.update({ where: { id: eventId }, data: { decision } });
  if (decision === "skip") await cancelEventRecording(eventId);
  else await scheduleDecidedEvents(ev.orgId);
}

export async function syncAllConnections() {
  const conns = await db.calendarConnection.findMany({ select: { id: true } });
  const results = await Promise.allSettled(conns.map((c) => syncConnection(c.id)));
  return { total: conns.length, failed: results.filter((r) => r.status === "rejected").length };
}
