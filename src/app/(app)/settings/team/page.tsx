import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { removeMemberAction, resendInviteAction, upsertMemberAction } from "@/app/actions/team";
import { fmtRelative } from "@/lib/utils";
import { Avatar, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function TeamPage() {
  const { org, membership } = await requireOrg();
  const isAdmin = membership.isAdmin;
  const members = await db.membership.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { assignedTasks: true } } } });
  const joined = members.filter((m) => m.userId).length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        count={members.length}
        description={<>Roles and responsibilities are what Rocky reads when deciding who should own each task. Keep them specific.{!isAdmin && " Only admins can edit the team."}</>}
        actions={isAdmin ? <a href="#invite" className="btn-primary"><Icon name="users" size={16} />Invite someone</a> : undefined}
      />
      <div className="text-xs text-muted -mt-2">{joined} of {members.length} have joined{joined < members.length ? " · invitees count as seats once they accept" : ""}.</div>

      <ul className="card divide-y divide-line/60 overflow-hidden">
        {members.map((m) => {
          const status = m.userId ? { label: "Joined", cls: "bg-grass-soft text-grass" } : m.invitedAt ? { label: `Invited ${fmtRelative(m.invitedAt)}`, cls: "bg-butter-soft text-copper-deep" } : { label: "Not invited", cls: "bg-paper-2 text-muted" };
          return (
            <li key={m.id}>
              <details className="group">
                <summary className="list-none cursor-pointer p-4 flex items-center gap-4 row-hover">
                  <Avatar name={m.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {m.name}
                      {m.id === membership.id && <span className="text-xs text-muted font-normal">(you)</span>}
                      {m.isAdmin && <span className="badge bg-ink text-paper">Admin</span>}
                    </div>
                    <div className="text-xs text-muted truncate">{m.role} · {m.email}</div>
                  </div>
                  <span className={`badge ${status.cls}`}>{status.label}</span>
                  <span className="hidden sm:inline text-xs text-muted w-16 text-right">{m._count.assignedTasks} task{m._count.assignedTasks === 1 ? "" : "s"}</span>
                  <Icon name="chevron" size={16} className="text-muted transition group-open:rotate-180" />
                </summary>
                <form action={upsertMemberAction} className="grid sm:grid-cols-2 gap-3 px-4 pb-5 pt-1 bg-paper-2/50 border-t edge">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="email" value={m.email} />
                  <div><label>Name</label><input name="name" defaultValue={m.name} disabled={!isAdmin} /></div>
                  <div><label>Email</label><input value={m.email} disabled /></div>
                  <div><label>Role</label><input name="role" defaultValue={m.role} disabled={!isAdmin} /></div>
                  <div className="flex items-end pb-2">
                    <label className="inline-flex items-center gap-2 font-normal"><input type="checkbox" name="isAdmin" defaultChecked={m.isAdmin} disabled={!isAdmin || m.id === membership.id} className="!w-auto" />Admin</label>
                  </div>
                  <div className="sm:col-span-2"><label>What they typically handle</label><textarea name="responsibilities" rows={2} defaultValue={m.responsibilities} disabled={!isAdmin} /></div>
                  {isAdmin && (
                    <div className="sm:col-span-2 flex flex-wrap gap-2 justify-between">
                      <button className="btn-primary">Save</button>
                      <span className="flex gap-2">
                        {!m.userId && <button formAction={resendInviteAction.bind(null, m.id)} className="btn-secondary">{m.invitedAt ? "Re-send invite" : "Send invite"}</button>}
                        {m.id !== membership.id && <button formAction={removeMemberAction.bind(null, m.id)} className="btn-ghost text-clay">Remove</button>}
                      </span>
                    </div>
                  )}
                </form>
              </details>
            </li>
          );
        })}
      </ul>

      {isAdmin && (
        <form id="invite" action={upsertMemberAction} className="card p-5 grid sm:grid-cols-2 gap-3 scroll-mt-6">
          <div className="sm:col-span-2">
            <h2 className="font-semibold">Invite a team member</h2>
            <p className="text-sm text-muted mt-0.5">They get an email with a link to join {org.name}. Once they connect their calendar, Rocky can record their meetings too.</p>
          </div>
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
