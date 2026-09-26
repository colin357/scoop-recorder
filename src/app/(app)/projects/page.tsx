import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { createProjectAction, deleteProjectAction, updateBusinessDescriptionAction } from "@/app/actions/team";
import { Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";

const PROJECT_COLORS = ["#f15025", "#191919", "#2f6fdb", "#1f8a4c", "#8e44ad", "#d99a00", "#0e9aa7", "#c2185b"];
import SuggestProjects from "./suggest";
import ProjectCleanupPanel from "./cleanup";
import { archiveProjectAction, mergeProjectsAction, restoreProjectAction } from "@/app/actions/projects";
import { activeProjectsByRecency, INACTIVE_DAYS, inactiveProjectIds } from "@/lib/projects";
import { ProjectOptions } from "@/components/project-options";
import { fmtRelative } from "@/lib/utils";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Form wrapper: merge this project into the one picked in the select. */
async function mergeIntoAction(sourceId: string, form: FormData) {
  "use server";
  const targetId = String(form.get("targetId") ?? "");
  if (targetId) await mergeProjectsAction(sourceId, targetId);
}

export default async function ProjectsPage() {
  const { org, membership } = await requireOrg();
  const [projects, members, recency, inactive] = await Promise.all([
    db.project.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true, meetings: true } }, tasks: { where: { status: { notIn: ["done", "draft"] } }, select: { id: true } } },
    }),
    db.membership.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
    activeProjectsByRecency(org.id),
    inactiveProjectIds(org.id),
  ]);
  const lastUsed = new Map(recency.map((p) => [p.id, p.lastUsed]));
  const order = new Map(recency.map((p, i) => [p.id, i]));
  const active = projects.filter((p) => !p.archivedAt).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const archived = projects.filter((p) => p.archivedAt);
  const inactiveSet = new Set(inactive);
  const choices = recency.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" count={active.length} description="Meetings and tasks are filed under these. Rocky suggests new ones; you decide." actions={<a href="#new-project" className="btn-primary"><Icon name="folder" size={16} />New project</a>} />
      {active.length >= 2 && <ProjectCleanupPanel names={Object.fromEntries(projects.map((p) => [p.id, p.name]))} inactiveCount={inactive.length} inactiveDays={INACTIVE_DAYS} />}
      {active.length === 0 ? <Empty title="No projects yet." pose="think" action={<a href="#new-project" className="btn-primary">Create a project</a>}>Add one below, or let Rocky suggest some from your business description.</Empty> : (
        <ul className="card divide-y divide-line/60">
          {active.map((p) => (
            <li key={p.id} className="p-4 flex flex-wrap items-center gap-3">
              <span className="h-8 w-8 shrink-0 rounded-lg inline-flex items-center justify-center text-paper" style={{ background: p.color }}><Icon name="folder" size={15} /></span>
              <div className="flex-1 min-w-48">
                <Link href={`/tasks?project=${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                {inactiveSet.has(p.id) && <span className="badge bg-paper-2 text-muted ml-2">Inactive</span>}
                <div className="text-xs text-muted mt-0.5 truncate">
                  {p.tasks.length} open · {plural(p._count.tasks, "task")} · {plural(p._count.meetings, "meeting")}{lastUsed.get(p.id) ? ` · active ${fmtRelative(lastUsed.get(p.id)!)}` : ""}{p.description ? ` · ${p.description}` : ""}
                </div>
              </div>
              <form action={archiveProjectAction.bind(null, p.id)}><button className="btn-ghost !py-1 text-xs">Archive</button></form>
              <details className="relative">
                <summary className="btn-ghost !py-1 text-xs list-none cursor-pointer">Merge</summary>
                <form action={mergeIntoAction.bind(null, p.id)} className="absolute right-0 top-full mt-1 z-20 card p-3 w-64 space-y-2 shadow-lift">
                  <div className="text-xs text-muted">Move all of “{p.name}” into:</div>
                  <select name="targetId" required defaultValue="" className="!py-1.5 text-sm"><option value="" disabled>Choose a project…</option><ProjectOptions projects={choices.filter((c) => c.id !== p.id)} /></select>
                  <button className="btn-primary !py-1.5 text-sm w-full">Merge</button>
                </form>
              </details>
              {membership.isAdmin && <form action={deleteProjectAction.bind(null, p.id)}><button className="text-xs text-muted hover:text-clay" title="Delete project (meetings and tasks are kept, unfiled)">Delete</button></form>}
            </li>
          ))}
        </ul>
      )}
      {archived.length > 0 && (
        <details className="card p-4 group">
          <summary className="cursor-pointer list-none text-sm font-medium flex items-center gap-2"><Icon name="chevron" size={14} className="-rotate-90 group-open:rotate-0 transition" />Archived ({archived.length})</summary>
          <ul className="mt-3 divide-y divide-line/60">
            {archived.map((p) => (
              <li key={p.id} className="py-2.5 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shrink-0 opacity-60" style={{ background: p.color }} />
                <Link href={`/tasks?project=${p.id}&done=1`} className="flex-1 min-w-0 truncate text-sm text-ink-soft hover:underline">{p.name}</Link>
                <span className="text-xs text-muted hidden sm:inline">{plural(p._count.tasks, "task")} · {plural(p._count.meetings, "meeting")}</span>
                <form action={restoreProjectAction.bind(null, p.id)}><button className="btn-ghost !py-1 text-xs">Restore</button></form>
              </li>
            ))}
          </ul>
        </details>
      )}
      {active.length < 4 && <SuggestProjects hasDescription={Boolean(org.businessDescription)} />}
      <form action={updateBusinessDescriptionAction} className="card p-5 space-y-3">
        <h2 className="font-semibold">About your business</h2>
        <p className="text-sm text-muted">What you do, who your clients are, what you&apos;re working on. Rocky uses this to guess projects and to file meetings under the right one.</p>
        <textarea name="businessDescription" rows={3} defaultValue={org.businessDescription ?? ""} placeholder="We're a 6-person marketing agency. Clients: Acme, Globex, Initech. We also build our own scheduling app on the side." />
        <button className="btn-secondary">Save</button>
      </form>
      <form id="new-project" action={createProjectAction} className="card p-5 grid sm:grid-cols-2 gap-3 scroll-mt-6">
        <h2 className="font-semibold sm:col-span-2">New project</h2>
        <div><label>Name</label><input name="name" required /></div>
        <div>
          <label>Color</label>
          <div className="flex flex-wrap gap-2 pt-1.5">
            {PROJECT_COLORS.map((c, i) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block h-7 w-7 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-paper peer-checked:ring-ink transition" style={{ background: c }} />
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2"><label>Description</label><input name="description" placeholder="Used by the AI to match meetings to this project" /></div>
        <div className="sm:col-span-2">
          <label>Members</label>
          <div className="flex flex-wrap gap-3">
            {members.map((m) => <label key={m.id} className="inline-flex items-center gap-1.5 font-normal"><input type="checkbox" name="memberIds" value={m.id} className="!w-auto" />{m.name}</label>)}
          </div>
        </div>
        <div className="sm:col-span-2"><button className="btn-primary">Create project</button></div>
      </form>
    </div>
  );
}
