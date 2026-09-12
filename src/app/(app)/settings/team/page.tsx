import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { removeMemberAction, upsertMemberAction } from "@/app/actions/team";

export default async function TeamPage() {
  const { org, membership } = await requireOrg();
  const members = await db.membership.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { assignedTasks: true } } } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-slate-500">Roles and responsibilities are what the AI reads when it decides who should own each task. Keep them specific.</p>
      </div>
      <ul className="space-y-3">
        {members.map((m) => (
          <li key={m.id} className="card p-5">
            <form action={upsertMemberAction} className="grid sm:grid-cols-2 gap-3">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="email" value={m.email} />
              <div><label>Name</label><input name="name" defaultValue={m.name} /></div>
              <div><label>Email</label><input value={m.email} disabled /><p className="text-xs text-slate-400 mt-1">{m.userId ? "Has an account" : "Invited — will link when they sign up with this email"} · {m._count.assignedTasks} tasks</p></div>
              <div><label>Role</label><input name="role" defaultValue={m.role} /></div>
              <div className="sm:col-span-2"><label>What they typically handle</label><textarea name="responsibilities" rows={2} defaultValue={m.responsibilities} /></div>
              <div className="sm:col-span-2 flex justify-between">
                <button className="btn-secondary">Save</button>
                {m.id !== membership.id && <button formAction={removeMemberAction.bind(null, m.id)} className="btn-ghost text-red-600">Remove</button>}
              </div>
            </form>
          </li>
        ))}
      </ul>
      <form action={upsertMemberAction} className="card p-5 grid sm:grid-cols-2 gap-3">
        <h2 className="font-semibold sm:col-span-2">Add a team member</h2>
        <div><label>Name</label><input name="name" required /></div>
        <div><label>Email</label><input name="email" type="email" required /></div>
        <div><label>Role</label><input name="role" placeholder="Designer" /></div>
        <div className="sm:col-span-2"><label>What they typically handle</label><textarea name="responsibilities" rows={2} placeholder="Mockups, brand assets, landing pages, design reviews" /></div>
        <div className="sm:col-span-2"><button className="btn-primary">Add member</button></div>
      </form>
    </div>
  );
}
