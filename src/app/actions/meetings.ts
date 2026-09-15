"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireOrg } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { consentNotice, createBot, parsePlainTranscript, recallConfigured } from "@/lib/recall";
import { detectPlatform } from "@/lib/utils";
import { approveDrafts, ingestFromRecall, processMeeting } from "@/lib/pipeline";
import { recordingAllowed } from "@/lib/billing";

export type MeetingFormState = { error?: string };

/** Send the recording bot to a meeting URL (now or at a scheduled time). */
export async function scheduleBotAction(_: MeetingFormState, form: FormData): Promise<MeetingFormState> {
  const { org } = await requireOrg();
  const meetingUrl = String(form.get("meetingUrl") ?? "").trim();
  const title = String(form.get("title") ?? "").trim() || "Untitled meeting";
  const projectId = String(form.get("projectId") ?? "") || null;
  const joinAtRaw = String(form.get("joinAt") ?? "");
  const joinAt = joinAtRaw ? new Date(joinAtRaw) : undefined;

  if (!/^https?:\/\//.test(meetingUrl)) return { error: "Paste a valid meeting link." };
  if (!recallConfigured()) return { error: "Recording bot is not configured (RECALL_API_KEY missing). Use the transcript upload below to test." };
  const gate = await recordingAllowed(org);
  if (!gate.ok) return { error: gate.reason };

  let botId: string;
  try {
    const bot = await createBot({ meetingUrl, botName: org.botName ?? `${org.name} Notetaker`, joinAt, notice: org.recordingNotice ? consentNotice(org.name, org.botName) : null });
    botId = bot.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create bot." };
  }

  const meeting = await db.meeting.create({
    data: {
      orgId: org.id,
      projectId,
      title,
      platform: detectPlatform(meetingUrl),
      meetingUrl,
      scheduledAt: joinAt ?? new Date(),
      status: joinAt ? "scheduled" : "joining",
      recallBotId: botId,
    },
  });
  redirect(`/meetings/${meeting.id}`);
}

/** Dev/test path and manual path: paste a transcript, get the full pipeline. */
export async function importTranscriptAction(_: MeetingFormState, form: FormData): Promise<MeetingFormState> {
  const { org } = await requireOrg();
  const title = String(form.get("title") ?? "").trim() || "Imported meeting";
  const raw = String(form.get("transcript") ?? "");
  const projectId = String(form.get("projectId") ?? "") || null;
  const recordingUrl = String(form.get("recordingUrl") ?? "").trim() || null;
  const platform = String(form.get("platform") ?? "other");
  const segments = parsePlainTranscript(raw);
  if (segments.length < 2) return { error: "Paste a transcript with at least a couple of lines like “Alice: …”." };

  const meeting = await db.meeting.create({
    data: {
      orgId: org.id,
      projectId,
      title,
      platform,
      recordingUrl,
      startedAt: new Date(),
      endedAt: new Date(),
      status: "processing",
      transcript: JSON.stringify(segments),
    },
  });
  try {
    await processMeeting(meeting.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Analysis failed." };
  }
  redirect(`/meetings/${meeting.id}`);
}

export async function reprocessMeetingAction(meetingId: string) {
  const { org } = await requireOrg();
  const meeting = await db.meeting.findFirst({ where: { id: meetingId, orgId: org.id } });
  if (!meeting) throw new Error("Not found");
  if (meeting.transcript) await processMeeting(meetingId);
  else if (meeting.recallBotId) await ingestFromRecall(meetingId);
  revalidatePath(`/meetings/${meetingId}`);
}

export async function deleteMeetingAction(meetingId: string) {
  const { org, membership } = await requireAdmin();
  const m = await db.meeting.findFirst({ where: { id: meetingId, orgId: org.id } });
  if (!m) redirect("/meetings");
  await db.meeting.delete({ where: { id: meetingId } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "meeting.deleted", entityType: "meeting", entityId: meetingId, summary: `${membership.name} deleted meeting “${m.title}”` });
  revalidatePath("/meetings");
  redirect(`/deleted?type=meeting&title=${encodeURIComponent(m.title)}`);
}

export async function approveTasksAction(meetingId: string, taskIds?: string[]) {
  const { org, membership } = await requireAdmin();
  const m = await db.meeting.findFirst({ where: { id: meetingId, orgId: org.id } });
  if (!m) return;
  await approveDrafts(meetingId, taskIds);
  await logActivity({ orgId: org.id, actorId: membership.id, action: "meeting.tasks_approved", entityType: "meeting", entityId: meetingId, summary: `${membership.name} approved ${taskIds ? taskIds.length : "all"} drafted task(s) for “${m.title}”` });
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/tasks");
}

export async function discardDraftAction(taskId: string) {
  const { org, membership } = await requireAdmin();
  const t = await db.task.findFirst({ where: { id: taskId, orgId: org.id, status: "draft" } });
  if (!t) return;
  await db.task.delete({ where: { id: taskId } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "task.draft_discarded", entityType: "task", entityId: taskId, summary: `${membership.name} discarded drafted task “${t.title}”` });
  if (t.meetingId) {
    const remaining = await db.task.count({ where: { meetingId: t.meetingId, status: "draft" } });
    if (remaining === 0) await approveDrafts(t.meetingId);
    revalidatePath(`/meetings/${t.meetingId}`);
  }
}

/** Turn something an outside person owes us into a task the team tracks (unassigned, due when they said). */
export async function trackCommitmentAction(commitmentId: string) {
  const { org, membership } = await requireOrg();
  const c = await db.meetingCommitment.findFirst({ where: { id: commitmentId, meeting: { orgId: org.id } }, include: { meeting: { select: { id: true, projectId: true, title: true } } } });
  if (!c) return;
  if (c.taskId) redirect(`/tasks/${c.taskId}`);
  const task = await db.task.create({
    data: {
      orgId: org.id,
      meetingId: c.meeting.id,
      projectId: c.meeting.projectId,
      title: `Follow up: ${c.title}`,
      description: `${c.ownerName} said they would do this in “${c.meeting.title}”. Chase it if it does not arrive.\n\n${c.description}`,
      status: "todo",
      priority: "medium",
      dueDate: c.dueDate,
      sourceTimestampSec: c.sourceTimestampSec,
      sourceQuote: c.sourceQuote,
      assignmentReason: `Tracking a commitment made by ${c.ownerName}.`,
    },
  });
  await db.meetingCommitment.update({ where: { id: c.id }, data: { taskId: task.id } });
  await logActivity({ orgId: org.id, actorId: membership.id, action: "task.created", entityType: "task", entityId: task.id, summary: `${membership.name} started tracking “${c.title}” (owed by ${c.ownerName})` });
  revalidatePath(`/meetings/${c.meeting.id}`);
  redirect(`/tasks/${task.id}`);
}
