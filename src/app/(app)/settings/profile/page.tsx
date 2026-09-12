import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAccountAction, updateProfileAction } from "@/app/actions/org";
import PasswordForm from "./password-form";

export default async function ProfilePage({ searchParams }: PageProps<"/settings/profile">) {
  const sp = await searchParams;
  const { user, membership, org } = await requireOrg();
  const teammates = await db.membership.findMany({ where: { orgId: membership.orgId, id: { not: membership.id } }, orderBy: { createdAt: "asc" }, select: { name: true, userId: true, isAdmin: true } });
  const joined = teammates.filter((t) => t.userId);
  const soleMember = joined.length === 0;
  const heir = membership.isAdmin && !joined.some((t) => t.isAdmin) ? joined[0] : null;
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      {sp.error === "confirm" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3">The email you typed didn&apos;t match, so nothing was deleted.</p>}

      <form action={updateProfileAction} className="card p-5 grid gap-3">
        <div><label>Name</label><input name="name" defaultValue={user.name} /></div>
        <div><label>Email</label><input value={user.email} disabled /></div>
        <div>
          <label>Slack member ID (optional)</label>
          <input name="slackUserId" defaultValue={membership.slackUserId ?? ""} placeholder="U0123ABCD" />
          <p className="text-xs text-muted mt-1">Lets Rocky @mention you in the team channel. Slack → your profile → ⋯ → Copy member ID.</p>
        </div>
        <label className="inline-flex items-center gap-2 font-normal"><input type="checkbox" name="notifyByEmail" defaultChecked={membership.notifyByEmail} className="!w-auto" />Email me when I&apos;m assigned a task or a summary is ready</label>
        <div><button className="btn-primary">Save</button></div>
      </form>
      <PasswordForm hasPassword={Boolean(user.passwordHash)} />

      <section className="card p-5 grid gap-3 border-clay/40">
        <h2 className="font-semibold text-clay">Delete my account</h2>
        <form action={deleteAccountAction} className="grid gap-4">
          {soleMember ? (
            <p className="text-sm text-muted">You&apos;re the only member of this workspace, so deleting your account also deletes the workspace and everything in it, and cancels any subscription. You can sign up again afterwards and go through onboarding from scratch. This cannot be undone.</p>
          ) : membership.isAdmin ? (
            <div className="grid gap-2">
              <label className="flex items-start gap-3 font-normal rounded-xl border edge p-3 has-[:checked]:border-merle has-[:checked]:bg-sky-soft">
                <input type="radio" name="scope" value="me" defaultChecked className="!w-auto mt-1" />
                <span><span className="font-medium text-ink block">Just my account</span><span className="text-sm text-muted">Removes you from {org.name} and deletes your sign-in. Your teammates keep everything.{heir ? ` ${heir.name} becomes an admin so the workspace isn't left without one.` : ""}</span></span>
              </label>
              <label className="flex items-start gap-3 font-normal rounded-xl border edge p-3 has-[:checked]:border-clay has-[:checked]:bg-clay-soft">
                <input type="radio" name="scope" value="everyone" className="!w-auto mt-1" />
                <span><span className="font-medium text-ink block">The whole workspace and every account in it</span><span className="text-sm text-muted">Deletes {org.name}, all {teammates.length + 1} members&apos; access, every meeting, recording, task and project, and cancels any subscription. Teammates whose only workspace this is lose their sign-in too.</span></span>
              </label>
            </div>
          ) : (
            <p className="text-sm text-muted">Removes you from {org.name} and deletes your sign-in. Your teammates keep the meetings and tasks; anything assigned to you stays, unassigned. This cannot be undone.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <label>Type your email to confirm</label>
              <input name="confirm" type="email" placeholder={user.email} autoComplete="off" required />
            </div>
            <button className="btn-secondary !border-clay !text-clay hover:!bg-clay-soft">Delete</button>
          </div>
        </form>
      </section>
    </div>
  );
}
