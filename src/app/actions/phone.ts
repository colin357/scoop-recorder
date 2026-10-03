"use server";

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { phoneAccess, recordingAllowed } from "@/lib/billing";
import { logActivity } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone-format";
import { callWithCode, isVerifiedCallerId, requestCallerIdVerification, twilioConfigured } from "@/lib/twilio";
import { startBridgeCall } from "@/lib/phone";

export type VerifyState = { code?: string; codeSent?: boolean; verified?: boolean; error?: string };

/**
 * What's waiting in User.phonePending while a number is being verified:
 * either Twilio's own verification call (the user types our code on the
 * keypad), or Rocky's call reading out a code the user types into Scoop.
 */
type Pending = { phone: string; sentAt: number; hash?: string; exp?: number; tries?: number };
const CODE_TTL_MS = 10 * 60_000;
const RESEND_AFTER_MS = 45_000;
const MAX_TRIES = 5;

function readPending(raw: string | null): Pending | null {
  if (!raw) return null;
  if (!raw.startsWith("{")) return { phone: raw, sentAt: 0 }; // older rows stored just the number
  try { return JSON.parse(raw) as Pending; } catch { return null; }
}
const savePending = (userId: string, p: Pending | null) => db.user.update({ where: { id: userId }, data: { phonePending: p ? JSON.stringify(p) : null } });
const hashCode = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}`).digest();

async function claimNumber(userId: string, phone: string) {
  const taken = await db.user.findFirst({ where: { phone, id: { not: userId } } });
  if (taken) return "That number is already verified by another Scoop account.";
  await db.user.update({ where: { id: userId }, data: { phone, phoneVerifiedAt: new Date(), phonePending: null } });
  revalidatePath("/settings/profile");
  revalidatePath("/calls");
  return null;
}

/**
 * Step 1: call the number with a code. Normally Twilio runs its caller-ID
 * verification (we show a code, the user types it on the keypad). If Twilio
 * already knows the number, Rocky calls and reads out a code instead, so
 * every number is proven by whoever answers it.
 */
export async function startPhoneVerificationAction(raw: string): Promise<VerifyState> {
  const { user } = await requireOrg();
  if (!twilioConfigured()) return { error: "Phone calls aren't set up yet." };
  const phone = normalizePhone(raw);
  if (!phone) return { error: "Enter a full number, like (239) 555-0123, or with a country code, like +44 20 7946 0958." };
  if (await db.user.findFirst({ where: { phone, id: { not: user.id } } })) return { error: "That number is already verified by another Scoop account." };
  const current = readPending((await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phonePending: true } })).phonePending);
  if (current && Date.now() - current.sentAt < RESEND_AFTER_MS) return { error: "We just called. Give it a moment before trying again." };
  try {
    const r = await requestCallerIdVerification(phone, `Scoop · ${user.name}`);
    if ("code" in r) {
      await savePending(user.id, { phone, sentAt: Date.now() });
      return { code: r.code };
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await savePending(user.id, { phone, sentAt: Date.now(), hash: hashCode(user.id, code).toString("hex"), exp: Date.now() + CODE_TTL_MS, tries: 0 });
    await callWithCode(phone, code);
    return { codeSent: true };
  } catch (e) {
    console.error("phone verification", e);
    await savePending(user.id, null);
    return { error: "Couldn't start the verification call. Check the number and try again." };
  }
}

/** Step 2 (Twilio's call): polled while the code is on screen. */
export async function checkPhoneVerificationAction(): Promise<VerifyState> {
  const { user } = await requireOrg();
  const pending = readPending((await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phonePending: true } })).phonePending);
  if (!pending || pending.hash) return {};
  if (!(await isVerifiedCallerId(pending.phone).catch(() => false))) return { verified: false };
  const err = await claimNumber(user.id, pending.phone);
  return err ? { error: err } : { verified: true };
}

/** Step 2 (Rocky's call): the user types the code Rocky read out. */
export async function confirmPhoneCodeAction(raw: string): Promise<VerifyState> {
  const { user } = await requireOrg();
  const pending = readPending((await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phonePending: true } })).phonePending);
  if (!pending?.hash || !pending.exp) return { error: "Start again with your number." };
  if (Date.now() > pending.exp) {
    await savePending(user.id, null);
    return { error: "That code expired. Start again with your number." };
  }
  const tries = (pending.tries ?? 0) + 1;
  const code = raw.replace(/\D/g, "");
  const expected = Buffer.from(pending.hash, "hex");
  const ok = code.length === 6 && timingSafeEqual(hashCode(user.id, code), expected);
  if (!ok) {
    if (tries >= MAX_TRIES) {
      await savePending(user.id, null);
      return { error: "Too many wrong codes. Start again with your number." };
    }
    await savePending(user.id, { ...pending, tries });
    return { codeSent: true, error: "That code isn't right. Check it and try again." };
  }
  const err = await claimNumber(user.id, pending.phone);
  return err ? { error: err } : { verified: true };
}

export async function removePhoneAction() {
  const { user } = await requireOrg();
  await db.user.update({ where: { id: user.id }, data: { phone: null, phoneVerifiedAt: null, phonePending: null } });
  revalidatePath("/settings/profile");
  redirect("/settings/profile?toast=Phone+removed");
}

export type CallState = { error?: string };

/** "Call with Rocky": ring the user, then the contact, and record both sides. */
export async function startPhoneCallAction(_: CallState, form: FormData): Promise<CallState> {
  const { user, org, membership } = await requireOrg();
  if (!twilioConfigured()) return { error: "Phone calls aren't set up yet." };
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true, phoneVerifiedAt: true } });
  if (!me.phone || !me.phoneVerifiedAt) return { error: "Verify your mobile number in Settings → Profile first." };
  const contactPhone = normalizePhone(String(form.get("contactPhone") ?? ""));
  if (!contactPhone) return { error: "Enter the number to call, like (239) 555-0123." };
  if (contactPhone === me.phone) return { error: "That's your own number." };
  const access = phoneAccess(org);
  if (!access.ok) return { error: access.reason };
  const gate = await recordingAllowed(org);
  if (!gate.ok) return { error: gate.reason };

  let meetingId: string;
  try {
    const m = await startBridgeCall({
      orgId: org.id,
      user: { name: user.name, email: user.email, phone: me.phone },
      contactPhone,
      contactName: String(form.get("contactName") ?? "").trim().slice(0, 80) || null,
      title: String(form.get("title") ?? "").trim().slice(0, 120) || null,
      projectId: String(form.get("projectId") ?? "") || null,
    });
    meetingId = m.id;
    await logActivity({ orgId: org.id, actorId: membership.id, action: "meeting.call_started", entityType: "meeting", entityId: m.id, summary: `${membership.name} started a call with Rocky` });
  } catch (e) {
    console.error("startBridgeCall", e);
    return { error: "Couldn't place the call. Please try again." };
  }
  redirect(`/meetings/${meetingId}`);
}
