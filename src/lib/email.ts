/**
 * Transactional email via Resend's REST API (RESEND_API_KEY, EMAIL_FROM).
 * Without a key, emails are logged to the server console instead of sent, so
 * local dev and previews keep working.
 */
import { appUrl } from "./urls";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: { to: string; subject: string; html: string; text?: string }) {
  const from = process.env.EMAIL_FROM ?? "Scoop <no-reply@scooprecorder.com>";
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:not-sent] to=${input.to} subject="${input.subject}"\n${input.text ?? input.html}`);
    return { sent: false as const };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
  });
  if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
  return { sent: true as const };
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <img src="${appUrl()}/mascot/wave.webp" width="40" height="40" alt="" style="vertical-align:middle">
      <span style="font-weight:600;font-size:18px">Scoop</span>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
      <div style="font-size:15px;line-height:1.55">${bodyHtml}</div>
      ${cta ? `<p style="margin:22px 0 4px"><a href="${cta.href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">${esc(cta.label)}</a></p>` : ""}
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px">Sent by Scoop · <a href="${appUrl()}/settings/profile" style="color:#94a3b8">notification settings</a></p>
  </div></body></html>`;
}

export const templates = {
  invite(p: { inviterName: string; orgName: string; link: string }) {
    return {
      subject: `${p.inviterName} invited you to ${p.orgName} on Scoop`,
      html: layout(`Join ${p.orgName} on Scoop`, `<p>${esc(p.inviterName)} added you to <b>${esc(p.orgName)}</b>. Scoop records your team's meetings and turns them into assigned tasks, so you'll get a heads-up whenever something lands on your plate.</p>`, { label: "Accept invitation", href: p.link }),
      text: `${p.inviterName} invited you to ${p.orgName} on Scoop. Accept: ${p.link}`,
    };
  },
  passwordReset(p: { link: string }) {
    return {
      subject: "Reset your Scoop password",
      html: layout("Reset your password", `<p>Click below to choose a new password. The link is valid for one hour. If you didn't ask for this, ignore this email.</p>`, { label: "Choose a new password", href: p.link }),
      text: `Reset your Scoop password: ${p.link}`,
    };
  },
  tasksAssigned(p: { name: string; meetingTitle: string; tasks: { title: string; due: string; link: string }[]; meetingLink: string }) {
    const items = p.tasks.map((t) => `<li style="margin:6px 0"><a href="${t.link}" style="color:#4f46e5;font-weight:600">${esc(t.title)}</a> <span style="color:#64748b">· due ${esc(t.due)}</span></li>`).join("");
    return {
      subject: `${p.tasks.length === 1 ? "1 new task" : `${p.tasks.length} new tasks`} from “${p.meetingTitle}”`,
      html: layout(`New tasks for you, ${p.name.split(" ")[0]}`, `<p>From the meeting <b>${esc(p.meetingTitle)}</b>:</p><ul style="padding-left:18px">${items}</ul><p>Each task links to the exact moment in the recording and has a step-by-step guide.</p>`, { label: "Open the meeting", href: p.meetingLink }),
      text: `New tasks from "${p.meetingTitle}":\n${p.tasks.map((t) => `- ${t.title} (due ${t.due}) ${t.link}`).join("\n")}`,
    };
  },
  summaryReady(p: { meetingTitle: string; summary: string; taskCount: number; link: string; review: boolean }) {
    return {
      subject: `${p.review ? "Review" : "Summary"}: ${p.meetingTitle}`,
      html: layout(p.review ? "Tasks are waiting for your review" : "Meeting summary ready", `<p><b>${esc(p.meetingTitle)}</b></p><p>${esc(p.summary)}</p><p>${p.taskCount} task${p.taskCount === 1 ? "" : "s"} ${p.review ? "drafted. Approve or edit them before your team is notified." : "created and assigned."}</p>`, { label: p.review ? "Review tasks" : "Open the meeting", href: p.link }),
      text: `${p.meetingTitle}\n\n${p.summary}\n\n${p.link}`,
    };
  },
};
