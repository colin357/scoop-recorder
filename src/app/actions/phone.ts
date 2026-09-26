"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { recordingAllowed } from "@/lib/billing";
import { logActivity } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone-format";
import { isVerifiedCallerId, requestCallerIdVerification, twilioConfigured } from "@/lib/twilio";
import { startBridgeCall } from "@/lib/phone";

export type VerifyState = { code?: string; verified?: boolean; error?: string };

async function claimNumber(userId: string, phone: string) {
  const taken = await db.user.findFirst({ where: { phone, id: { not: userId } } });
  if (taken) return "That number is already verified by another Scoop account.";
  await db.user.update({ where: { id: userId }, data: { phone, phoneVerifiedAt: new Date(), phonePending: null } });
  revalidatePath("/settings/profile");
  revalidatePath("/calls");
  return null;
}

/** Step 1: Twilio calls the number and the user types the code we show. */
export async function startPhoneVerificationAction(raw: string): Promise<VerifyState> {
  const { user } = await requireOrg();
  if (!twilioConfigured()) return { error: "Phone calls aren't set up yet." };
  const phone = normalizePhone(raw);
  if (!phone) return { error: "Enter a full number, like (239) 555-0123, or with a country code, like +44 20 7946 0958." };
  if (await db.user.findFirst({ where: { phone, id: { not: user.id } } })) return { error: "That number is already verified by another Scoop account." };
  try {
    const r = await requestCallerIdVerification(phone, `Scoop · ${user.name}`);
    if ("alreadyVerified" in r) {
      const err = await claimNumber(user.id, phone);
      return err ? { error: err } : { verified: true };
    }
    await db.user.update({ where: { id: user.id }, data: { phonePending: phone } });
    return { code: r.code };
  } catch (e) {
    console.error("caller id verification", e);
    return { error: "Couldn't start the verification call. Check the number and try again." };
  }
}

/** Step 2: polled while the code is on screen. */
export async function checkPhoneVerificationAction(): Promise<VerifyState> {
  const { user } = await requireOrg();
  const pending = (await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phonePending: true } })).phonePending;
  if (!pending) return {};
  if (!(await isVerifiedCallerId(pending).catch(() => false))) return { verified: false };
  const err = await claimNumber(user.id, pending);
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
