"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { updateTaskAction } from "@/app/actions/tasks";
import { DueBadge, PriorityBadge, ProjectChip, StatusBadge } from "@/components/ui";
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

  const controls = (t: TaskRow) => (
    <div className="flex gap-2">
      <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className="!w-auto !py-1 text-xs">
        {COLUMNS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <select value={t.assignee?.id ?? ""} onChange={(e) => setAssignee(t.id, e.target.value)} className="!w-auto !py-1 text-xs">
        <option value="">Unassigned</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  );

  if (view === "board") {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col} className="rounded-xl bg-slate-100 p-3 min-h-40">
            <div className="flex items-center justify-between mb-2"><StatusBadge status={col} /><span className="text-xs text-slate-500">{rows.filter((t) => t.status === col).length}</span></div>
            <div className="space-y-2">
              {rows.filter((t) => t.status === col).map((t) => (
                <div key={t.id} className="card p-3 space-y-2">
                  <Link href={`/tasks/${t.id}`} className="text-sm font-medium hover:text-indigo-600 block">{t.title}</Link>
                  <div className="flex flex-wrap items-center gap-2"><ProjectChip project={t.project} /><DueBadge date={t.dueDate ? new Date(t.dueDate) : null} status={t.status} /><PriorityBadge priority={t.priority} /></div>
                  {controls(t)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-slate-100">
      {rows.map((t) => (
        <li key={t.id} className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-60">
            <Link href={`/tasks/${t.id}`} className={`font-medium hover:text-indigo-600 ${t.status === "done" ? "line-through text-slate-400" : ""}`}>{t.title}</Link>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
              <ProjectChip project={t.project} />
              <DueBadge date={t.dueDate ? new Date(t.dueDate) : null} status={t.status} />
              {t.stepsTotal > 0 && <span>{t.stepsDone}/{t.stepsTotal} steps</span>}
              {t.meeting && <Link href={`/meetings/${t.meeting.id}`} className="hover:text-slate-900">from “{t.meeting.title}”</Link>}
            </div>
          </div>
          <PriorityBadge priority={t.priority} />
          {controls(t)}
        </li>
      ))}
    </ul>
  );
}
