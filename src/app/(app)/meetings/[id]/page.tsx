import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtTimestamp, PLATFORM_LABEL, safeJson } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/recall";
import { DueBadge, PriorityBadge, ProjectChip, StatusBadge } from "@/components/ui";
import { deleteMeetingAction, reprocessMeetingAction } from "@/app/actions/meetings";
import RecordingPlayer from "@/components/recording-player";
import { Mascot } from "@/components/mascot";
import LiveStatus from "@/components/live-status";
import ReviewDrafts from "./review";

// Server actions on this page run the AI pipeline; allow long executions on Vercel.
export const maxDuration = 300;

export default async function MeetingPage({ params, searchParams }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const { t } = await searchParams;
  const { org, membership } = await requireOrg();
  const meeting = await db.meeting.findFirst({
    where: { id, orgId: org.id },
    include: { project: true, tasks: { include: { assignee: true, project: true }, orderBy: { dueDate: "asc" } } },
  });
  if (!meeting) notFound();

  const transcript = safeJson<TranscriptSegment[]>(meeting.transcript, []);
  const keyPoints = safeJson<string[]>(meeting.keyPoints, []);
  const decisions = safeJson<string[]>(meeting.decisions, []);
  const startAt = typeof t === "string" ? Number(t) || 0 : 0;
  const drafts = meeting.tasks.filter((x) => x.status === "draft");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/meetings" className="text-sm text-muted hover:text-ink">← Meetings</Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{meeting.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted mt-1">
            <span>{PLATFORM_LABEL[meeting.platform]}</span>
            <span>{fmtDateTime(meeting.startedAt ?? meeting.scheduledAt ?? meeting.createdAt)}</span>
            {meeting.durationSec != null && <span>{Math.round(meeting.durationSec / 60)} min</span>}
            <ProjectChip project={meeting.project} />
            <StatusBadge status={meeting.status} />
            <LiveStatus meetingId={meeting.id} status={meeting.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {(meeting.transcript || meeting.recallBotId) && (
            <form action={reprocessMeetingAction.bind(null, meeting.id)}><button className="btn-secondary">Re-run AI</button></form>
          )}
          {membership.isAdmin && <form action={deleteMeetingAction.bind(null, meeting.id)}><button className="btn-ghost text-clay">Delete</button></form>}
        </div>
      </div>

      {drafts.length > 0 && membership.isAdmin && (
        <ReviewDrafts meetingId={meeting.id} drafts={drafts.map((d) => ({ id: d.id, title: d.title, assignee: d.assignee?.name ?? null, due: fmtDate(d.dueDate) }))} />
      )}
      {drafts.length > 0 && !membership.isAdmin && (
        <p className="rounded-md bg-pink-soft border border-pink text-pink text-sm p-3">{drafts.length} task{drafts.length === 1 ? " is" : "s are"} waiting for an admin to review before they&apos;re assigned.</p>
      )}
      {meeting.recordingDeletedAt && <p className="rounded-md bg-paper-2 border border-line text-ink-soft text-sm p-3">The recording and transcript were deleted under your retention policy on {fmtDate(meeting.recordingDeletedAt)}. Summary and tasks are kept.</p>}
      {meeting.error && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3">{meeting.error}</p>}
      {["scheduled", "joining", "recording", "processing"].includes(meeting.status) && (
        <div className="hero rounded-2xl border edge p-4 flex items-center gap-4">
          <Mascot pose={meeting.status === "processing" ? "write" : "listen"} size={64} />
          <p className="text-sm text-ink-soft">
            {meeting.status === "processing"
              ? "Rocky is writing up the summary and sorting out tasks. This usually takes under a minute."
              : `The recorder ${meeting.status === "scheduled" ? "will join" : "is in"} the call. Summary and tasks appear here automatically when the meeting ends.`}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <RecordingPlayer url={meeting.recordingUrl} startAt={startAt} transcript={transcript} />

          {meeting.summary && (
            <section className="card p-5 space-y-4">
              <div><h2 className="font-semibold mb-1">Summary</h2><p className="text-sm text-ink-soft leading-relaxed">{meeting.summary}</p></div>
              {keyPoints.length > 0 && (
                <div><h3 className="text-sm font-semibold mb-1">Key points</h3>
                  <ul className="list-disc pl-5 text-sm text-ink-soft space-y-1">{keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul></div>
              )}
              {decisions.length > 0 && (
                <div><h3 className="text-sm font-semibold mb-1">Decisions</h3>
                  <ul className="list-disc pl-5 text-sm text-ink-soft space-y-1">{decisions.map((k, i) => <li key={i}>{k}</li>)}</ul></div>
              )}
            </section>
          )}
        </div>

        <section className="lg:col-span-2">
          <h2 className="font-semibold mb-3">Tasks from this meeting ({meeting.tasks.length})</h2>
          {meeting.tasks.length === 0 ? (
            <p className="text-sm text-muted">No tasks yet.</p>
          ) : (
            <ul className="space-y-3">
              {meeting.tasks.map((task) => (
                <li key={task.id} className="card p-4">
                  <Link href={`/tasks/${task.id}`} className="font-medium hover:text-merle">{task.title}</Link>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
                    <span>{task.assignee ? task.assignee.name : "Unassigned"}</span>
                    <span>·</span>
                    <DueBadge date={task.dueDate} status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                  {task.sourceTimestampSec != null && (
                    <Link href={`/meetings/${meeting.id}?t=${task.sourceTimestampSec}`} className="text-xs text-merle mt-2 inline-block">
                      ▶ Discussed at {fmtTimestamp(task.sourceTimestampSec)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
