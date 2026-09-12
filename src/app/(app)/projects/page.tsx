import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { createProjectAction, deleteProjectAction } from "@/app/actions/team";
import { Empty } from "@/components/ui";

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
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      {projects.length === 0 ? <Empty title="No projects yet." /> : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id} className="card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Link href={`/tasks?project=${p.id}`} className="font-semibold flex items-center gap-2 hover:text-indigo-600">
                  <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />{p.name}
                </Link>
                <form action={deleteProjectAction.bind(null, p.id)}><button className="text-xs text-slate-400 hover:text-red-600">Delete</button></form>
              </div>
              {p.description && <p className="text-sm text-slate-600">{p.description}</p>}
              <div className="text-xs text-slate-500">{p.tasks.length} open of {p._count.tasks} tasks · {p._count.meetings} meetings</div>
              {p.members.length > 0 && <div className="text-xs text-slate-500">Team: {p.members.map((m) => m.member.name).join(", ")}</div>}
            </li>
          ))}
        </ul>
      )}
      <form action={createProjectAction} className="card p-5 grid sm:grid-cols-2 gap-3">
        <h2 className="font-semibold sm:col-span-2">New project</h2>
        <div><label>Name</label><input name="name" required /></div>
        <div><label>Color</label><input name="color" type="color" defaultValue="#6366f1" className="h-10" /></div>
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
