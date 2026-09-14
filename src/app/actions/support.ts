"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { layout, sendEmail } from "@/lib/email";
import { LEGAL } from "@/lib/legal";
import { SUPPORT_CATEGORIES } from "@/lib/support";


const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** File a support request from the in-app help button. Stored, then emailed to support. */
export async function submitSupportRequestAction(input: { category: string; subject: string; message: string; pageUrl?: string; userAgent?: string }) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in to contact support." };
  const category = SUPPORT_CATEGORIES.some((c) => c.key === input.category) ? input.category : "other";
  const subject = input.subject.trim().slice(0, 200);
  const message = input.message.trim().slice(0, 5000);
  if (!subject) return { ok: false as const, error: "Give it a short subject." };
  if (message.length < 10) return { ok: false as const, error: "Tell us a little more so we can help." };

  const membership = await db.membership.findFirst({ where: { userId: user.id }, include: { org: { select: { id: true, name: true, billingStatus: true, billingPlan: true } } }, orderBy: { createdAt: "asc" } });
  const row = await db.supportRequest.create({
    data: {
      userId: user.id, orgId: membership?.org.id ?? null, orgName: membership?.org.name ?? null,
      email: user.email, name: user.name, category, subject, message,
      pageUrl: input.pageUrl?.slice(0, 500) ?? null, userAgent: input.userAgent?.slice(0, 300) ?? null,
    },
  });

  const label = SUPPORT_CATEGORIES.find((c) => c.key === category)?.label ?? category;
  const meta = [
    ["From", `${user.name} <${user.email}>`],
    ["Workspace", membership ? `${membership.org.name} (${membership.org.billingStatus}${membership.org.billingPlan ? `, ${membership.org.billingPlan}` : ""})` : "none"],
    ["Category", label],
    ["Page", input.pageUrl ?? "unknown"],
    ["Browser", input.userAgent ?? "unknown"],
    ["Request ID", row.id],
  ];
  const html = layout(
    `Support: ${esc(subject)}`,
    `<table style="font-size:13px;color:#555;border-collapse:collapse">${meta.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;font-weight:600">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join("")}</table>
     <p style="white-space:pre-wrap;margin-top:16px">${esc(message)}</p>`,
  );
  const text = `${meta.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${message}`;
  try {
    await sendEmail({ to: LEGAL.contactEmail, subject: `[Scoop support] ${label}: ${subject}`, html, text, replyTo: user.email });
  } catch (e) {
    console.error("support email failed", e);
  }
  return { ok: true as const, id: row.id };
}

/** Operator: mark a request resolved (or reopen it). */
export async function resolveSupportRequestAction(id: string, resolved: boolean) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.email)) throw new Error("Not allowed");
  await db.supportRequest.update({ where: { id }, data: { status: resolved ? "resolved" : "open", resolvedAt: resolved ? new Date() : null } });
  revalidatePath("/admin");
}
