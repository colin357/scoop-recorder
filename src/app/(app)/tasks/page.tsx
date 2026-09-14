import Link from "next/link";
import { endOfWeek } from "date-fns";
import { endOfDayIn, requestTimeZone, startOfDayIn } from "@/lib/tz";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import FilterSelects from "@/components/filter-selects";
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
  const view = sp.view === "list" ? "list" : "board";
  const showDone = sp.done === "1";

  const now = new Date();
  const tz = requestTimeZone();
  const dueWhere =
    due === "overdue" ? { lt: startOfDayIn(now, tz) }
    : due === "today" ? { gte: startOfDayIn(now, tz), lte: endOfDayIn(now, tz) }
    : due === "week" ? { gte: startOfDayIn(now, tz), lte: endOfWeek(now, { weekStartsOn: 1 }) }
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
    for (const [k, v] of [...p.entries()]) if (!v || (k === "due" && v === "all") || (k === "view" && v === "board")) p.delete(k);
    return `/tasks?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        count={tasks.length}
        description="Everything Rocky pulled out of your meetings, plus anything you added by hand."
        actions={
          <div className="flex gap-0.5 rounded-xl border edge bg-paper p-0.5 text-sm shadow-soft">
            <Link href={qs({ view: "board" })} className={`px-3 py-1 rounded-lg font-display font-medium ${view === "board" ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-2"}`}>Board</Link>
            <Link href={qs({ view: "list" })} className={`px-3 py-1 rounded-lg font-display font-medium ${view === "list" ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-2"}`}>List</Link>
          </div>
        }
      />

      {/* Phones: three dropdowns. Tablets and up: pill rows. */}
      <div className="md:hidden space-y-2">
        <FilterSelects
          filters={[
            { name: "project", label: "Project", value: project, options: [{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: p.id, label: p.name }))] },
            { name: "assignee", label: "Assignee", value: assigneeParam, options: [{ value: "", label: "Everyone" }, { value: "me", label: "Me" }, ...members.filter((m) => m.id !== membership.id).map((m) => ({ value: m.id, label: m.name }))] },
            { name: "due", label: "Due", value: due, options: DUE_FILTERS.map((d) => ({ value: d.key, label: d.label })) },
          ]}
          hrefFor={{
            project: Object.fromEntries([["", qs({ project: "" })], ...projects.map((p) => [p.id, qs({ project: p.id })])]),
            assignee: Object.fromEntries([["", qs({ assignee: "" })], ["me", qs({ assignee: "me" })], ...members.map((m) => [m.id, qs({ assignee: m.id })])]),
            due: Object.fromEntries(DUE_FILTERS.map((d) => [d.key, qs({ due: d.key })])),
          }}
        />
        <Link href={qs({ done: showDone ? "" : "1" })} className="inline-block text-xs text-muted hover:text-ink">{showDone ? "Hide done" : "Show done"}</Link>
      </div>
      <div className="hidden md:flex flex-wrap gap-4 items-end">
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
        <Empty title="No tasks match these filters." pose="think" action={<Link href="/meetings/new" className="btn-primary"><Icon name="mic" size={16} />Record a meeting</Link>}>Record a meeting and Rocky will create tasks here, or add one manually below.</Empty>
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

      <details className="card p-4 group">
        <summary className="cursor-pointer text-sm font-medium flex items-center gap-2 list-none"><span className="h-6 w-6 rounded-lg bg-paper-2 inline-flex items-center justify-center text-ink-soft group-open:rotate-45 transition"><Icon name="close" size={14} className="rotate-45" /></span>Add a task manually</summary>
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
    <Link href={href} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${active ? "bg-ink text-paper border-ink" : "bg-paper text-ink-soft edge hover:bg-paper-2 hover:text-ink"}`}>
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {children}
    </Link>
  );
}
