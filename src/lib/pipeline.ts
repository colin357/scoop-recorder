import { addDays } from "date-fns";
import { db } from "./db";
import { analyzeMeeting } from "./ai";
import { fetchTranscript, getBot, recordingUrlFromBot, type TranscriptSegment } from "./recall";

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
    const [team, projects] = await Promise.all([
      db.membership.findMany({ where: { orgId: meeting.orgId } }),
      db.project.findMany({ where: { orgId: meeting.orgId } }),
    ]);
    const meetingDate = meeting.startedAt ?? meeting.scheduledAt ?? meeting.createdAt;

    const analysis = await analyzeMeeting({
      title: meeting.title,
      meetingDate,
      transcript,
      team: team.map((m) => ({ id: m.id, name: m.name, role: m.role, responsibilities: m.responsibilities })),
      projects: projects.map((p) => ({ id: p.id, name: p.name, description: p.description })),
    });

    const projectId = meeting.projectId ?? analysis.projectId;

    await db.$transaction(async (tx) => {
      // Re-running analysis replaces previously generated (still-untouched) tasks.
      await tx.task.deleteMany({ where: { meetingId, status: "todo" } });
      await tx.meeting.update({
        where: { id: meetingId },
        data: {
          status: "done",
          projectId,
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          decisions: JSON.stringify(analysis.decisions),
        },
      });
      for (const t of analysis.tasks) {
        await tx.task.create({
          data: {
            orgId: meeting.orgId,
            meetingId,
            projectId,
            assigneeId: t.assigneeId,
            title: t.title,
            description: t.description,
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
    });
  } catch (err) {
    await db.meeting.update({
      where: { id: meetingId },
      data: { status: "failed", error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

/** Pull recording + transcript from Recall for a bot-backed meeting, then process. */
export async function ingestFromRecall(meetingId: string) {
  const meeting = await db.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  if (!meeting.recallBotId) throw new Error("Meeting has no Recall bot");
  const bot = await getBot(meeting.recallBotId);
  const transcript = await fetchTranscript(bot);
  const rec = bot.recordings?.[0];
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
