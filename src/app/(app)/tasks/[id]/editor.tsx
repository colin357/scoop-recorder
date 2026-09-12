"use client";

import { useTransition } from "react";
import { updateTaskAction } from "@/app/actions/tasks";
import { STATUS_LABEL } from "@/lib/utils";

type Props = {
  task: { id: string; status: string; priority: string; assigneeId: string | null; projectId: string | null; dueDate: string };
  projects: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

export default function TaskEditor({ task, projects, members }: Props) {
  const [pending, start] = useTransition();
  const update = (patch: Parameters<typeof updateTaskAction>[1]) => start(() => updateTaskAction(task.id, patch));
  return (
    <section className={`card p-5 space-y-3 ${pending ? "opacity-70" : ""}`}>
      <h2 className="font-semibold">Details</h2>
      <div><label>Status</label>
        <select defaultValue={task.status} onChange={(e) => update({ status: e.target.value })}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></div>
      <div><label>Assignee</label>
        <select defaultValue={task.assigneeId ?? ""} onChange={(e) => update({ assigneeId: e.target.value || null })}>
          <option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select></div>
      <div><label>Project</label>
        <select defaultValue={task.projectId ?? ""} onChange={(e) => update({ projectId: e.target.value || null })}>
          <option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <div><label>Due date</label><input type="date" defaultValue={task.dueDate} onChange={(e) => update({ dueDate: e.target.value || null })} /></div>
      <div><label>Priority</label>
        <select defaultValue={task.priority} onChange={(e) => update({ priority: e.target.value })}>
          {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select></div>
    </section>
  );
}
