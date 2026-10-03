import { createHmac, timingSafeEqual } from "crypto";
import { appUrl } from "./urls";

/**
 * Twilio for phone calls: one Scoop number (TWILIO_PHONE_NUMBER) places
 * "Call with Rocky" calls and answers when a user merges Rocky into a call.
 * TWILIO_API_BASE overrides the API host for local testing.
 */
export function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
}

export function scoopNumber() {
  return process.env.TWILIO_PHONE_NUMBER ?? null;
}

const apiBase = () => (process.env.TWILIO_API_BASE ?? "https://api.twilio.com").replace(/\/$/, "");
const basicAuth = () => "Basic " + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");

export class TwilioError extends Error {
  constructor(message: string, public status: number, public code?: number) {
    super(message);
  }
}

async function twilioApi<T>(path: string, init: { method?: string; form?: Record<string, string | undefined> } = {}): Promise<T> {
  const url = `${apiBase()}/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}${path}`;
  const body = init.form ? new URLSearchParams(Object.entries(init.form).filter((e): e is [string, string] => e[1] !== undefined)) : undefined;
  const res = await fetch(url, {
    method: init.method ?? (body ? "POST" : "GET"),
    headers: { Authorization: basicAuth(), ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let code: number | undefined;
    try { code = (JSON.parse(text) as { code?: number }).code; } catch {}
    throw new TwilioError(`Twilio ${init.method ?? (body ? "POST" : "GET")} ${path} failed: ${res.status} ${text}`, res.status, code);
  }
  return (text ? JSON.parse(text) : null) as T;
}

// ---------- Caller ID verification ----------

/**
 * Start verifying a user's own number so calls can show it as caller ID (and so
 * we know the person owns the phone we ring). Twilio calls the number and the
 * user types the returned code on the keypad.
 */
export async function requestCallerIdVerification(phone: string, friendlyName: string): Promise<{ code: string } | { alreadyVerified: true }> {
  try {
    const r = await twilioApi<{ validation_code: string }>("/OutgoingCallerIds.json", { form: { PhoneNumber: phone, FriendlyName: friendlyName.slice(0, 64) } });
    return { code: r.validation_code };
  } catch (err) {
    if (err instanceof TwilioError && err.code === 21450) return { alreadyVerified: true }; // already a verified caller ID
    throw err;
  }
}

export async function isVerifiedCallerId(phone: string) {
  const r = await twilioApi<{ outgoing_caller_ids?: { phone_number: string }[] }>(`/OutgoingCallerIds.json?PhoneNumber=${encodeURIComponent(phone)}`);
  return (r.outgoing_caller_ids ?? []).some((c) => c.phone_number === phone);
}

// ---------- Calls & recordings ----------

/** Ring `to` from the Scoop number; Twilio fetches TwiML from `url` when it is answered. */
export async function placeCall(opts: { to: string; url: string; statusCallback: string }) {
  return twilioApi<{ sid: string }>("/Calls.json", {
    form: { To: opts.to, From: scoopNumber() ?? undefined, Url: opts.url, StatusCallback: opts.statusCallback, Timeout: "30" },
  });
}

/**
 * Ring a number and have Rocky read out a code. Used to confirm someone owns a
 * number that is already a verified caller ID on the Twilio account (Twilio
 * won't run its own verification call twice).
 */
export async function callWithCode(to: string, code: string) {
  const spoken = code.split("").join(", ");
  const body = `<Pause length="1"/>${say(`G'day, it's Rocky from Scoop. Your verification code is ${spoken}. Again, your code is ${spoken}.`)}`;
  return twilioApi<{ sid: string }>("/Calls.json", {
    form: { To: to, From: scoopNumber() ?? undefined, Twiml: `<Response>${body}</Response>`, Timeout: "30" },
  });
}

/** Errors Twilio logged for a call, newest first. Best effort: [] if the lookup fails. */
export async function callErrors(sid: string): Promise<{ code: number; text: string }[]> {
  try {
    const r = await twilioApi<{ notifications?: { error_code: string | null; message_text: string | null }[] }>(`/Calls/${sid}/Notifications.json`);
    return (r.notifications ?? []).filter((n) => n.error_code).map((n) => ({ code: Number(n.error_code), text: decodeURIComponent((n.message_text ?? "").replace(/\+/g, " ")) }));
  } catch {
    return [];
  }
}

export async function getCall(sid: string) {
  return twilioApi<{ sid: string; status: string; end_time: string | null }>(`/Calls/${sid}.json`);
}

export async function deleteRecording(sid: string) {
  try {
    await twilioApi<unknown>(`/Recordings/${sid}.json`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof TwilioError && err.status === 404)) throw err;
  }
}

/** Recording media is behind Twilio auth; only our own server fetches it. */
export function isTwilioMediaUrl(url: string) {
  return url.startsWith(apiBase() + "/");
}

export async function fetchTwilioMedia(url: string, range?: string | null) {
  if (!isTwilioMediaUrl(url)) throw new Error("Not a Twilio media URL");
  return fetch(url, { headers: { Authorization: basicAuth(), ...(range ? { Range: range } : {}) }, cache: "no-store" });
}

// ---------- Webhooks & TwiML ----------

/** Twilio signs webhooks: base64(HMAC-SHA1(authToken, url + sorted key/value pairs)). */
export function validTwilioSignature(url: string, params: Record<string, string>, signature: string | null) {
  if (!signature || !process.env.TWILIO_AUTH_TOKEN) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = Buffer.from(createHmac("sha1", process.env.TWILIO_AUTH_TOKEN).update(data, "utf8").digest("base64"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Parse and authenticate a Twilio webhook. Returns null when it is not genuinely from Twilio. */
export async function readTwilioWebhook(req: Request): Promise<Record<string, string> | null> {
  if (!twilioConfigured()) return null;
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => { if (typeof v === "string") params[k] = v; });
  const u = new URL(req.url);
  const sig = req.headers.get("x-twilio-signature");
  const candidates = [`${appUrl()}${u.pathname}${u.search}`, req.url];
  return candidates.some((c) => validTwilioSignature(c, params, sig)) ? params : null;
}

export function voiceHook(step: string, meetingId?: string) {
  return `${appUrl()}/api/twilio/voice/${step}${meetingId ? `?m=${encodeURIComponent(meetingId)}` : ""}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Rocky speaks with an Australian voice. */
export function say(text: string) {
  return `<Say voice="Polly.Russell" language="en-AU">${esc(text)}</Say>`;
}

export function attr(value: string) {
  return esc(value);
}

export function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, { headers: { "Content-Type": "text/xml" } });
}
