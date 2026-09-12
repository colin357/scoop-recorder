import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { removeMemberAction, resendInviteAction, upsertMemberAction } from "@/app/actions/team";
import { fmtRelative } from "@/lib/utils";

export default async function TeamPage() {
  const { org, membership } = await requireOrg();
  const isAdmin = membership.isAdmin;
  const members = await db.membership.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { assignedTasks: true } } } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-slate-500">Roles and responsibilities are what the AI reads when it decides who should own each task. Keep them specific.{!isAdmin && " Only admins can edit the team."}</p>
      </div>
      <ul className="space-y-3">
        {members.map((m) => (
          <li key={m.id} className="card p-5">
            <form action={upsertMemberAction} className="grid sm:grid-cols-2 gap-3">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="email" value={m.email} />
              <div><label>Name</label><input name="name" defaultValue={m.name} disabled={!isAdmin} /></div>
              <div>
                <label>Email</label><input value={m.email} disabled />
                <p className="text-xs text-slate-400 mt-1">
                  {m.userId ? "Has an account" : m.invitedAt ? `Invited ${fmtRelative(m.invitedAt)}` : "Not invited yet"} · {m._count.assignedTasks} tasks{m.isAdmin ? " · admin" : ""}
                </p>
              </div>
              <div><label>Role</label><input name="role" defaultValue={m.role} disabled={!isAdmin} /></div>
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 font-normal"><input type="checkbox" name="isAdmin" defaultChecked={m.isAdmin} disabled={!isAdmin || m.id === membership.id} className="!w-auto" />Admin</label>
              </div>
              <div className="sm:col-span-2"><label>What they typically handle</label><textarea name="responsibilities" rows={2} defaultValue={m.responsibilities} disabled={!isAdmin} /></div>
              {isAdmin && (
                <div className="sm:col-span-2 flex flex-wrap gap-2 justify-between">
                  <button className="btn-secondary">Save</button>
                  <span className="flex gap-2">
                    {!m.userId && <button formAction={resendInviteAction.bind(null, m.id)} className="btn-ghost">{m.invitedAt ? "Re-send invite" : "Send invite"}</button>}
                    {m.id !== membership.id && <button formAction={removeMemberAction.bind(null, m.id)} className="btn-ghost text-red-600">Remove</button>}
                  </span>
                </div>
              )}
            </form>
          </li>
        ))}
      </ul>
      {isAdmin && (
        <form action={upsertMemberAction} className="card p-5 grid sm:grid-cols-2 gap-3">
          <h2 className="font-semibold sm:col-span-2">Invite a team member</h2>
          <p className="text-sm text-slate-500 sm:col-span-2">They get an email with a link to join {org.name}. Once they connect their calendar, Rocky can record their meetings too.</p>
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Email</label><input name="email" type="email" required /></div>
          <div><label>Role</label><input name="role" placeholder="Designer" /></div>
          <div className="flex items-end pb-2"><label className="inline-flex items-center gap-2 font-normal"><input type="checkbox" name="isAdmin" className="!w-auto" />Admin</label></div>
          <div className="sm:col-span-2"><label>What they typically handle</label><textarea name="responsibilities" rows={2} placeholder="Mockups, brand assets, landing pages, design reviews" /></div>
          <div className="sm:col-span-2"><button className="btn-primary">Send invitation</button></div>
        </form>
      )}
    </div>
  );
}
