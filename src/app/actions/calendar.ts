"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireOrg } from "@/lib/auth";
import { setEventDecision, syncConnection } from "@/lib/calendar";

export async function decideEventAction(eventId: string, decision: "record" | "skip") {
  const { org } = await requireOrg();
  const ev = await db.calendarEvent.findFirst({ where: { id: eventId, orgId: org.id } });
  if (!ev) throw new Error("Not found");
  await setEventDecision(eventId, decision);
  revalidatePath("/dashboard");
  revalidatePath("/settings/calendar");
}

export async function setRecordPolicyAction(form: FormData) {
  const { org } = await requireAdmin();
  const policy = String(form.get("policy"));
  if (!["auto", "ask", "off"].includes(policy)) return;
  await db.organization.update({ where: { id: org.id }, data: { autoRecordPolicy: policy } });
  if (policy === "auto") {
    await db.calendarEvent.updateMany({ where: { orgId: org.id, decision: "undecided" }, data: { decision: "record" } });
    const { scheduleDecidedEvents } = await import("@/lib/calendar");
    await scheduleDecidedEvents(org.id);
  }
  revalidatePath("/settings/calendar");
  revalidatePath("/dashboard");
}

export async function syncNowAction() {
  const { org } = await requireOrg();
  const conns = await db.calendarConnection.findMany({ where: { orgId: org.id } });
  await Promise.allSettled(conns.map((c) => syncConnection(c.id)));
  revalidatePath("/settings/calendar");
  revalidatePath("/dashboard");
}

export async function disconnectCalendarAction(connId: string) {
  const { org } = await requireOrg();
  await db.calendarConnection.deleteMany({ where: { id: connId, orgId: org.id } });
  revalidatePath("/settings/calendar");
}
