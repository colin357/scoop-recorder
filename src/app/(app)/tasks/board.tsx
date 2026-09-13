"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { updateTaskAction } from "@/app/actions/tasks";
import { Avatar, DueBadge, PriorityBadge, ProjectChip, StatusBadge } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/utils";

export type TaskRow = {
  id: string; title: string; status: string; priority: string; dueDate: string | null;
  project: { id: string; name: string; color: string } | null;
  assignee: { id: string; name: string } | null;
  meeting: { id: string; title: string } | null;
  stepsTotal: number; stepsDone: number;
};

const COLUMNS = ["todo", "in_progress", "blocked", "done"];

export default function TaskBoard({ view, tasks, members }: { view: "list" | "board"; tasks: TaskRow[]; members: { id: string; name: string }[] }) {
  const [rows, setRows] = useOptimistic(tasks, (state, patch: { id: string; status?: string; assignee?: TaskRow["assignee"] }) =>
    state.map((t) => (t.id === patch.id ? { ...t, ...(patch.status && { status: patch.status }), ...(patch.assignee !== undefined && { assignee: patch.assignee }) } : t)),
  );
  const [, start] = useTransition();

  const setStatus = (id: string, status: string) =>
    start(async () => { setRows({ id, status }); await updateTaskAction(id, { status }); });
  const setAssignee = (id: string, assigneeId: string) =>
    start(async () => {
      setRows({ id, assignee: members.find((m) => m.id === assigneeId) ?? null });
      await updateTaskAction(id, { assigneeId: assigneeId || null });
    });

  // Board cards are narrow: two equal columns, no avatar (the dropdown shows
  // the name). The list row keeps the natural-width controls with the avatar.
  const controls = (t: TaskRow, compact = false) => (
    <div className={compact ? "grid grid-cols-2 gap-2" : "flex items-center gap-2 min-w-0"}>
      <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className={`!py-1 !rounded-lg text-xs font-medium min-w-0 ${compact ? "!pr-6 [background-position:right_0.4rem_center]" : "!w-auto"}`} aria-label="Status">
        {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <span className="inline-flex items-center gap-1.5 min-w-0">
        {!compact && t.assignee && <Avatar name={t.assignee.name} size="sm" />}
        <select value={t.assignee?.id ?? ""} onChange={(e) => setAssignee(t.id, e.target.value)} className={`!py-1 !rounded-lg text-xs font-medium min-w-0 ${compact ? "!pr-6 [background-position:right_0.4rem_center]" : "!w-auto"}`} aria-label="Assignee">
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </span>
    </div>
  );

  if (view === "board") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col} className="rounded-xl bg-paper-2 p-3 min-h-40 min-w-0">
            <div className="flex items-center justify-between mb-2"><StatusBadge status={col} /><span className="text-xs text-muted">{rows.filter((t) => t.status === col).length}</span></div>
            <div className="space-y-2">
              {rows.filter((t) => t.status === col).map((t) => (
                <div key={t.id} className="card p-3 space-y-2 hover:shadow-lift transition">
                  <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:underline block">{t.title}</Link>
                  <div className="flex flex-wrap items-center gap-2"><ProjectChip project={t.project} /><DueBadge date={t.dueDate ? new Date(t.dueDate) : null} status={t.status} /><PriorityBadge priority={t.priority} /></div>
                  {controls(t, true)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-line/60">
      {rows.map((t) => (
        <li key={t.id} className="p-4 flex flex-wrap items-center gap-4 row-hover">
          <button
            type="button"
            onClick={() => setStatus(t.id, t.status === "done" ? "todo" : "done")}
            aria-label={t.status === "done" ? "Mark as to do" : "Mark as done"}
            className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${t.status === "done" ? "bg-grass border-grass text-paper" : "border-dust hover:border-ink"}`}
          >
            {t.status === "done" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 9.5 17 19 7" /></svg>}
          </button>
          <div className="flex-1 min-w-60">
            <Link href={`/tasks/${t.id}`} className={`font-medium hover:underline ${t.status === "done" ? "line-through text-muted" : ""}`}>{t.title}</Link>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
              <ProjectChip project={t.project} />
              <DueBadge date={t.dueDate ? new Date(t.dueDate) : null} status={t.status} />
              {t.stepsTotal > 0 && <span>{t.stepsDone}/{t.stepsTotal} steps</span>}
              {t.meeting && <Link href={`/meetings/${t.meeting.id}`} className="hover:text-ink">from “{t.meeting.title}”</Link>}
            </div>
          </div>
          <PriorityBadge priority={t.priority} />
          {controls(t)}
        </li>
      ))}
    </ul>
  );
}
