import { addDays } from "date-fns";
import { db } from "./db";
import { analyzeMeeting } from "./ai";
import { lastUsage } from "./llm";
import { notifyMeetingProcessed } from "./notify";
import { logActivity } from "./audit";
import { fetchTranscript, getBot, recordingUrlFromBot, type TranscriptSegment } from "./recall";

const PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

/**
 * Run the AI pipeline on a meeting that already has a transcript:
 * summary + key points + decisions, then tasks with assignees, deadlines and steps.
 */
export async function processMeeting(meetingId: string) {
  const meeting = await db.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  const transcript: TranscriptSegment[] = meeting.transcript ? JSON.parse(meeting.transcript) : [];
  if (!transcript.length) {
    await db.meeting.update({ where: { id: meetingId }, data: { status: "failed", error: "No transcript available." } });
    return;
  }

  await db.meeting.update({ where: { id: meetingId }, data: { status: "processing", error: null } });

  try {
    const [team, projects, org, attendeeRows] = await Promise.all([
      db.membership.findMany({ where: { orgId: meeting.orgId } }),
      db.project.findMany({ where: { orgId: meeting.orgId } }),
      db.organization.findUniqueOrThrow({ where: { id: meeting.orgId } }),
      db.meetingAttendee.findMany({ where: { meetingId } }),
    ]);
    const meetingDate = meeting.startedAt ?? meeting.scheduledAt ?? meeting.createdAt;

    // Mark each attendee as on the team or external so commitments by guests
    // (clients, vendors) are not turned into the team's tasks.
    const teamEmails = new Set(team.map((m) => m.email.toLowerCase()));
    const teamNames = new Set(team.map((m) => m.name.trim().toLowerCase()));
    const isInternal = (name: string, email: string | null) => (email ? teamEmails.has(email.toLowerCase()) : false) || teamNames.has(name.trim().toLowerCase());
    const attendeeSource = attendeeRows.length ? attendeeRows.map((a) => ({ name: a.name, email: a.email })) : [...new Set(transcript.map((s) => s.speaker))].map((name) => ({ name, email: null }));
    const attendees = attendeeSource.filter((a) => a.name && a.name !== "Unknown").map((a) => ({ name: a.name, email: a.email, internal: isInternal(a.name, a.email) }));

    const analysis = await analyzeMeeting({
      title: meeting.title,
      meetingDate,
      transcript,
      team: team.map((m) => ({ id: m.id, name: m.name, role: m.role, responsibilities: m.responsibilities })),
      projects: projects.map((p) => ({ id: p.id, name: p.name, description: p.description })),
      attendees,
      businessDescription: org.businessDescription,
    });

    let projectId = meeting.projectId ?? analysis.projectId;
    if (!projectId && analysis.newProject) {
      // Reuse a same-named project if one appeared meanwhile, otherwise create it.
      const existing = await db.project.findFirst({ where: { orgId: meeting.orgId, name: { equals: analysis.newProject.name, mode: "insensitive" } } });
      const created = existing ?? (await db.project.create({
        data: { orgId: meeting.orgId, name: analysis.newProject.name, description: analysis.newProject.description, color: PALETTE[projects.length % PALETTE.length] },
      }));
      projectId = created.id;
    }

    const usage = lastUsage;
    const draft = org.reviewBeforeAssign;
    const teamItems = analysis.tasks.filter((t) => t.owner !== "external");
    const externalItems = analysis.tasks.filter((t) => t.owner === "external");
    await db.$transaction(async (tx) => {
      // Re-running analysis replaces previously generated (still-untouched) tasks and untracked commitments.
      await tx.task.deleteMany({ where: { meetingId, status: { in: ["todo", "draft"] } } });
      await tx.meetingCommitment.deleteMany({ where: { meetingId, taskId: null } });
      await tx.meeting.update({
        where: { id: meetingId },
        data: {
          status: "done",
          projectId,
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          decisions: JSON.stringify(analysis.decisions),
          reviewedAt: draft ? null : new Date(),
          aiInputTokens: usage?.inputTokens ?? null,
          aiOutputTokens: usage?.outputTokens ?? null,
        },
      });
      for (const t of teamItems) {
        // Items whose owner is unclear are never auto-assigned: they wait as drafts for a person to decide.
        const unclear = t.owner === "unclear";
        await tx.task.create({
          data: {
            orgId: meeting.orgId,
            meetingId,
            projectId,
            assigneeId: unclear ? null : t.assigneeId,
            title: t.title,
            description: unclear && t.ownerName ? `${t.description}\n\nRocky wasn't sure whether this is ours or ${t.ownerName}'s. Confirm before assigning.` : t.description,
            status: draft || unclear ? "draft" : "todo",
            priority: t.priority,
            dueDate: addDays(meetingDate, t.dueInDays),
            assignmentReason: t.assignmentReason,
            sourceTimestampSec: t.sourceTimestampSec,
            sourceQuote: t.sourceQuote,
            steps: {
              create: t.steps.map((s, i) => ({
                order: i,
                title: s.title,
                details: s.details,
                dueDate: addDays(meetingDate, s.dueInDays),
              })),
            },
          },
        });
      }
      for (const c of externalItems) {
        await tx.meetingCommitment.create({
          data: {
            meetingId,
            ownerName: c.ownerName ?? "Someone outside the team",
            title: c.title,
            description: c.description,
            dueDate: addDays(meetingDate, c.dueInDays),
            sourceTimestampSec: c.sourceTimestampSec,
            sourceQuote: c.sourceQuote,
          },
        });
      }
    });
    await logActivity({ orgId: meeting.orgId, action: "meeting.processed", entityType: "meeting", entityId: meetingId, summary: `Summary and ${teamItems.length} task(s) generated for “${meeting.title}”${draft ? " (awaiting review)" : ""}${externalItems.length ? `, ${externalItems.length} item(s) waiting on others` : ""}` });
    await notifyMeetingProcessed(meetingId).catch((e) => console.error("notify failed", e));
  } catch (err) {
    await db.meeting.update({
      where: { id: meetingId },
      data: { status: "failed", error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

/** Approve drafted tasks (all, or a subset) and notify assignees. */
export async function approveDrafts(meetingId: string, taskIds?: string[]) {
  const where = { meetingId, status: "draft", ...(taskIds ? { id: { in: taskIds } } : {}) };
  await db.task.updateMany({ where, data: { status: "todo" } });
  const remaining = await db.task.count({ where: { meetingId, status: "draft" } });
  if (remaining === 0) {
    await db.meeting.update({ where: { id: meetingId }, data: { reviewedAt: new Date() } });
    await notifyMeetingProcessed(meetingId).catch((e) => console.error("notify failed", e));
  }
}

/** Pull recording + transcript from Recall for a bot-backed meeting, then process. */
export async function ingestFromRecall(meetingId: string) {
  const meeting = await db.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (!meeting.recallBotId) throw new Error("Meeting has no Recall bot");
  const bot = await getBot(meeting.recallBotId);
  const transcript = await fetchTranscript(bot);
  const rec = bot.recordings?.[0];
  if (!transcript.length) {
    // bot.done can arrive before the transcript artifact is ready; transcript.done will re-trigger us.
    await db.meeting.update({
      where: { id: meetingId },
      data: { status: "processing", recordingUrl: recordingUrlFromBot(bot) ?? meeting.recordingUrl, endedAt: meeting.endedAt ?? new Date() },
    });
    return;
  }
  const startedAt = rec?.started_at ? new Date(rec.started_at) : meeting.startedAt;
  const endedAt = rec?.completed_at ? new Date(rec.completed_at) : meeting.endedAt;
  await db.meeting.update({
    where: { id: meetingId },
    data: {
      transcript: JSON.stringify(transcript),
      recordingUrl: recordingUrlFromBot(bot),
      startedAt,
      endedAt,
      durationSec: startedAt && endedAt ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000) : null,
    },
  });
  await processMeeting(meetingId);
}
