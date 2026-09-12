import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDate, fmtTimestamp, PLATFORM_LABEL } from "@/lib/utils";
import { DueBadge, PriorityBadge, ProjectChip, StatusBadge } from "@/components/ui";
import TaskEditor from "./editor";
import TaskChat from "./chat";
import { addCommentAction, deleteTaskAction, toggleStepAction } from "@/app/actions/tasks";
import { fmtRelative } from "@/lib/utils";

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const { org, membership } = await requireOrg();
  const [task, projects, members, activity] = await Promise.all([
    db.task.findFirst({
      where: { id, orgId: org.id },
      include: { project: true, assignee: true, meeting: true, steps: { orderBy: { order: "asc" } }, messages: { orderBy: { createdAt: "asc" } }, comments: { include: { member: true }, orderBy: { createdAt: "asc" } } },
    }),
    db.project.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    db.membership.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    db.activityLog.findMany({ where: { orgId: org.id, entityType: "task", entityId: id }, orderBy: { createdAt: "desc" }, take: 30, include: { actor: true } }),
  ]);
  if (!task) notFound();
  const canDelete = membership.isAdmin || task.assigneeId === membership.id;

  const recordingHref = task.meeting ? `/meetings/${task.meeting.id}${task.sourceTimestampSec != null ? `?t=${task.sourceTimestampSec}` : ""}` : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-900">← Tasks</Link>
        <div className="flex items-start justify-between gap-4 mt-1">
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          {canDelete && <form action={deleteTaskAction.bind(null, task.id)}><button className="btn-ghost text-red-600">Delete</button></form>}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <DueBadge date={task.dueDate} status={task.status} />
          <ProjectChip project={task.project} />
          <span className="text-slate-500">{task.assignee ? `Assigned to ${task.assignee.name}` : "Unassigned"}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <section className="card p-5 space-y-3">
            <h2 className="font-semibold">What needs to happen</h2>
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{task.description || "No description."}</p>
            {task.assignmentReason && (
              <p className="text-xs text-slate-500 rounded-md bg-slate-50 p-3"><span className="font-medium">Why the AI assigned it this way:</span> {task.assignmentReason}</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-3">Step-by-step guide</h2>
            {task.steps.length === 0 ? (
              <p className="text-sm text-slate-500">No steps.</p>
            ) : (
              <ol className="space-y-3">
                {task.steps.map((s, i) => (
                  <li key={s.id} className="flex gap-3">
                    <form action={toggleStepAction.bind(null, s.id, !s.completedAt)}>
                      <button className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center text-xs ${s.completedAt ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-slate-500"}`} aria-label="Toggle step">
                        {s.completedAt ? "✓" : ""}
                      </button>
                    </form>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${s.completedAt ? "line-through text-slate-400" : ""}`}>{i + 1}. {s.title}</div>
                      {s.details && <p className="text-sm text-slate-600 mt-0.5">{s.details}</p>}
                      <div className="text-xs text-slate-500 mt-1">Due {fmtDate(s.dueDate)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="font-semibold">Comments</h2>
            {task.comments.length === 0 ? <p className="text-sm text-slate-500">No comments yet. Blocked on something? Say so here.</p> : (
              <ul className="space-y-3">
                {task.comments.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="text-xs text-slate-500"><span className="font-medium text-slate-700">{c.member?.name ?? "Former member"}</span> · {fmtRelative(c.createdAt)}</div>
                    <p className="whitespace-pre-line text-slate-800 mt-0.5">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <form action={addCommentAction.bind(null, task.id)} className="flex gap-2">
              <input name="body" placeholder="Write a comment…" required />
              <button className="btn-secondary">Post</button>
            </form>
          </section>

          {activity.length > 0 && (
            <section className="card p-5">
              <h2 className="font-semibold mb-2">Activity</h2>
              <ul className="space-y-1.5 text-sm">
                {activity.map((a) => <li key={a.id} className="text-slate-600"><span className="text-xs text-slate-400 mr-2">{fmtRelative(a.createdAt)}</span>{a.summary}</li>)}
              </ul>
            </section>
          )}

          {task.meeting && (
            <section className="card p-5 space-y-3">
              <h2 className="font-semibold">Context from the meeting</h2>
              <div className="text-sm text-slate-600">
                <Link href={`/meetings/${task.meeting.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{task.meeting.title}</Link>
                <span> · {PLATFORM_LABEL[task.meeting.platform]} · {fmtDate(task.meeting.startedAt ?? task.meeting.createdAt)}</span>
              </div>
              {task.sourceQuote && <blockquote className="border-l-2 border-indigo-300 pl-3 text-sm text-slate-700 italic">“{task.sourceQuote}”</blockquote>}
              {recordingHref && (
                <Link href={recordingHref} className="btn-secondary">
                  ▶ Watch the recording{task.sourceTimestampSec != null ? ` at ${fmtTimestamp(task.sourceTimestampSec)}` : ""}
                </Link>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <TaskEditor
            task={{ id: task.id, status: task.status, priority: task.priority, assigneeId: task.assigneeId, projectId: task.projectId, dueDate: task.dueDate?.toISOString().slice(0, 10) ?? "" }}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            members={members.map((m) => ({ id: m.id, name: m.name }))}
          />
          <TaskChat taskId={task.id} initial={task.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))} hasMeeting={Boolean(task.meeting)} />
        </div>
      </div>
    </div>
  );
}
