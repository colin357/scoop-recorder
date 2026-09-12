/**
 * Fan-out after a meeting is processed (or its drafts approved):
 * email each assignee, email the org admins a summary, and post to Slack / Teams.
 */
import { db } from "./db";
import { sendEmail, templates } from "./email";
import { fmtDate } from "./utils";
import { appUrl } from "./urls";

export async function notifyMeetingProcessed(meetingId: string) {
  const meeting = await db.meeting.findUnique({
    where: { id: meetingId },
    include: { org: true, tasks: { include: { assignee: true }, orderBy: { dueDate: "asc" } } },
  });
  if (!meeting || !meeting.summary) return;
  const base = appUrl();
  const meetingLink = `${base}/meetings/${meeting.id}`;
  const review = meeting.org.reviewBeforeAssign && !meeting.reviewedAt;
  const liveTasks = meeting.tasks.filter((t) => t.status !== "draft");

  // Admins always get the summary (and the review request in review mode).
  const admins = await db.membership.findMany({ where: { orgId: meeting.orgId, isAdmin: true, notifyByEmail: true } });
  await Promise.allSettled(
    admins.map((a) =>
      sendEmail({ to: a.email, ...templates.summaryReady({ meetingTitle: meeting.title, summary: meeting.summary!, taskCount: meeting.tasks.length, link: meetingLink, review }) }),
    ),
  );
  if (review) return; // assignees and channels are notified after approval

  // Assignees
  const byAssignee = new Map<string, typeof liveTasks>();
  for (const t of liveTasks) if (t.assigneeId) byAssignee.set(t.assigneeId, [...(byAssignee.get(t.assigneeId) ?? []), t]);
  await Promise.allSettled(
    [...byAssignee.values()].map(async (tasks) => {
      const m = tasks[0].assignee!;
      if (!m.notifyByEmail) return;
      await sendEmail({
        to: m.email,
        ...templates.tasksAssigned({
          name: m.name,
          meetingTitle: meeting.title,
          meetingLink,
          tasks: tasks.map((t) => ({ title: t.title, due: fmtDate(t.dueDate), link: `${base}/tasks/${t.id}` })),
        }),
      });
    }),
  );

  // Channels
  const lines = liveTasks.map((t) => {
    const who = t.assignee ? (t.assignee.slackUserId ? `<@${t.assignee.slackUserId}>` : t.assignee.name) : "Unassigned";
    return `• <${base}/tasks/${t.id}|${t.title}> — ${who}, due ${fmtDate(t.dueDate)}`;
  });
  const text = `*${meeting.title}* — summary ready\n${meeting.summary}\n\n*Tasks (${liveTasks.length})*\n${lines.join("\n") || "_none_"}\n<${meetingLink}|Open in Scoop>`;
  await Promise.allSettled([postSlack(meeting.org.slackWebhookUrl, text), postTeams(meeting.org.teamsWebhookUrl, meeting.title, meeting.summary, liveTasks.map((t) => `- ${t.title} — ${t.assignee?.name ?? "Unassigned"}, due ${fmtDate(t.dueDate)}`), meetingLink)]);

  await db.meeting.update({ where: { id: meetingId }, data: { notifiedAt: new Date() } });
}

export async function notifyTaskAssigned(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId }, include: { assignee: true, meeting: true, org: true } });
  if (!task?.assignee || !task.assignee.notifyByEmail || task.status === "draft") return;
  const base = appUrl();
  await sendEmail({
    to: task.assignee.email,
    ...templates.tasksAssigned({
      name: task.assignee.name,
      meetingTitle: task.meeting?.title ?? "a task",
      meetingLink: task.meeting ? `${base}/meetings/${task.meeting.id}` : `${base}/tasks/${task.id}`,
      tasks: [{ title: task.title, due: fmtDate(task.dueDate), link: `${base}/tasks/${task.id}` }],
    }),
  }).catch((e) => console.error("notifyTaskAssigned", e));
}

export async function postSlack(webhookUrl: string | null | undefined, text: string) {
  if (!webhookUrl) return;
  const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
}

export async function postTeams(webhookUrl: string | null | undefined, title: string, summary: string, taskLines: string[], link: string) {
  if (!webhookUrl) return;
  const card = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: title, weight: "Bolder", size: "Medium", wrap: true },
            { type: "TextBlock", text: summary, wrap: true },
            { type: "TextBlock", text: taskLines.join("\n\n") || "_No tasks_", wrap: true },
          ],
          actions: [{ type: "Action.OpenUrl", title: "Open in Scoop", url: link }],
        },
      },
    ],
  };
  const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card) });
  if (!res.ok) throw new Error(`Teams webhook failed: ${res.status}`);
}
