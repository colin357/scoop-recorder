import Link from "next/link";
import { endOfDay, startOfDay, endOfWeek } from "date-fns";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { Empty } from "@/components/ui";
import TaskBoard from "./board";
import { createTaskAction } from "@/app/actions/tasks";

const DUE_FILTERS = [
  { key: "all", label: "Any date" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "none", label: "No date" },
];

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg();
  const project = typeof sp.project === "string" ? sp.project : "";
  const assigneeParam = typeof sp.assignee === "string" ? sp.assignee : "";
  const assignee = assigneeParam === "me" ? membership.id : assigneeParam;
  const due = typeof sp.due === "string" ? sp.due : "all";
  const view = sp.view === "board" ? "board" : "list";
  const showDone = sp.done === "1";

  const now = new Date();
  const dueWhere =
    due === "overdue" ? { lt: startOfDay(now) }
    : due === "today" ? { gte: startOfDay(now), lte: endOfDay(now) }
    : due === "week" ? { gte: startOfDay(now), lte: endOfWeek(now, { weekStartsOn: 1 }) }
    : due === "later" ? { gt: endOfWeek(now, { weekStartsOn: 1 }) }
    : due === "none" ? null
    : undefined;

  const [tasks, projects, members] = await Promise.all([
    db.task.findMany({
      where: {
        orgId: org.id,
        ...(project && { projectId: project }),
        ...(assignee && { assigneeId: assignee }),
        ...(dueWhere !== undefined && { dueDate: dueWhere }),
        ...(showDone ? { status: { not: "draft" } } : { status: { notIn: ["done", "draft"] } }),
      },
      include: { project: true, assignee: true, meeting: { select: { id: true, title: true } }, _count: { select: { steps: true } }, steps: { select: { completedAt: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    db.project.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    db.membership.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ project, assignee: assigneeParam, due, view, done: showDone ? "1" : "" });
    for (const [k, v] of Object.entries(patch)) p.set(k, v);
    for (const [k, v] of [...p.entries()]) if (!v || (k === "due" && v === "all") || (k === "view" && v === "list")) p.delete(k);
    return `/tasks?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <div className="flex gap-1 rounded-xl border-2 border-ink bg-paper p-0.5 text-sm">
          <Link href={qs({ view: "list" })} className={`px-3 py-1 rounded-lg font-display ${view === "list" ? "bg-ink text-paper" : ""}`}>List</Link>
          <Link href={qs({ view: "board" })} className={`px-3 py-1 rounded-lg font-display ${view === "board" ? "bg-ink text-paper" : ""}`}>Board</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <FilterGroup label="Project">
          <Pill href={qs({ project: "" })} active={!project}>All</Pill>
          {projects.map((p) => <Pill key={p.id} href={qs({ project: p.id })} active={project === p.id} dot={p.color}>{p.name}</Pill>)}
        </FilterGroup>
        <FilterGroup label="Assignee">
          <Pill href={qs({ assignee: "" })} active={!assigneeParam}>Everyone</Pill>
          <Pill href={qs({ assignee: "me" })} active={assigneeParam === "me"}>Me</Pill>
          {members.filter((m) => m.id !== membership.id).map((m) => <Pill key={m.id} href={qs({ assignee: m.id })} active={assigneeParam === m.id}>{m.name}</Pill>)}
        </FilterGroup>
        <FilterGroup label="Due">
          {DUE_FILTERS.map((d) => <Pill key={d.key} href={qs({ due: d.key })} active={due === d.key}>{d.label}</Pill>)}
        </FilterGroup>
        <Link href={qs({ done: showDone ? "" : "1" })} className="text-xs text-muted hover:text-ink pb-1.5">{showDone ? "Hide done" : "Show done"}</Link>
      </div>

      {tasks.length === 0 ? (
        <Empty title="No tasks match these filters." pose="think">Record a meeting and the AI will create tasks here, or add one manually below.</Empty>
      ) : (
        <TaskBoard
          view={view}
          tasks={tasks.map((t) => ({
            id: t.id, title: t.title, status: t.status, priority: t.priority,
            dueDate: t.dueDate?.toISOString() ?? null,
            project: t.project ? { id: t.project.id, name: t.project.name, color: t.project.color } : null,
            assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
            meeting: t.meeting,
            stepsTotal: t._count.steps,
            stepsDone: t.steps.filter((s) => s.completedAt).length,
          }))}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
        />
      )}

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-medium">+ Add a task manually</summary>
        <form action={createTaskAction} className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="sm:col-span-2"><label>Title</label><input name="title" required /></div>
          <div className="sm:col-span-2"><label>Description</label><textarea name="description" rows={2} /></div>
          <div><label>Project</label><select name="projectId" defaultValue=""><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label>Assignee</label><select name="assigneeId" defaultValue=""><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label>Due date</label><input type="date" name="dueDate" /></div>
          <div><label>Priority</label><select name="priority" defaultValue="medium">{["low", "medium", "high", "urgent"].map((p) => <option key={p}>{p}</option>)}</select></div>
          <div className="sm:col-span-2"><button className="btn-primary">Create task</button></div>
        </form>
      </details>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Pill({ href, active, dot, children }: { href: string; active: boolean; dot?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${active ? "bg-ink text-paper border-ink" : "bg-paper text-ink-soft border-ink/60 hover:bg-sky-soft"}`}>
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {children}
    </Link>
  );
}
