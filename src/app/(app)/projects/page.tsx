import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { createProjectAction, deleteProjectAction, updateBusinessDescriptionAction } from "@/app/actions/team";
import { Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";

const PROJECT_COLORS = ["#f15025", "#191919", "#2f6fdb", "#1f8a4c", "#8e44ad", "#d99a00", "#0e9aa7", "#c2185b"];
import SuggestProjects from "./suggest";

export default async function ProjectsPage() {
  const { org } = await requireOrg();
  const [projects, members] = await Promise.all([
    db.project.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" },
      include: { members: { include: { member: true } }, _count: { select: { tasks: true, meetings: true } }, tasks: { where: { status: { not: "done" } }, select: { id: true } } },
    }),
    db.membership.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Projects" count={projects.length} description="Projects let people filter their work. Meetings and tasks get filed under the right one automatically." actions={<a href="#new-project" className="btn-primary"><Icon name="folder" size={16} />New project</a>} />
      <SuggestProjects hasDescription={Boolean(org.businessDescription)} />
      {projects.length === 0 ? <Empty title="No projects yet." pose="think" action={<a href="#new-project" className="btn-primary">Create a project</a>}>Add one below, or let Rocky suggest some from your business description.</Empty> : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id} className="card p-5 space-y-2 hover:shadow-lift transition">
              <div className="flex items-center justify-between">
                <Link href={`/tasks?project=${p.id}`} className="font-semibold flex items-center gap-2.5 hover:underline">
                  <span className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-paper" style={{ background: p.color }}><Icon name="folder" size={16} /></span>{p.name}
                </Link>
                <form action={deleteProjectAction.bind(null, p.id)}><button className="text-xs text-muted hover:text-clay">Delete</button></form>
              </div>
              {p.description && <p className="text-sm text-ink-soft">{p.description}</p>}
              <div className="text-xs text-muted">{p.tasks.length} open of {p._count.tasks} tasks · {p._count.meetings} meetings</div>
              {p.members.length > 0 && <div className="text-xs text-muted">Team: {p.members.map((m) => m.member.name).join(", ")}</div>}
            </li>
          ))}
        </ul>
      )}
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
