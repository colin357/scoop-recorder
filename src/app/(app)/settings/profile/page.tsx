import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAccountAction, updateProfileAction } from "@/app/actions/org";
import PasswordForm from "./password-form";

export default async function ProfilePage({ searchParams }: PageProps<"/settings/profile">) {
  const sp = await searchParams;
  const { user, membership } = await requireOrg();
  const soleMember = (await db.membership.count({ where: { orgId: membership.orgId } })) === 1;
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      {sp.error === "confirm" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3">The email you typed didn&apos;t match, so nothing was deleted.</p>}
      {sp.error === "sole_admin" && <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3">You&apos;re the only admin of a workspace that still has other members. Make someone else an admin under Team, or delete the workspace under Organization, then try again.</p>}
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
        <p className="text-sm text-muted">
          {soleMember
            ? "You're the only member of this workspace, so deleting your account also deletes the workspace and everything in it, and cancels any subscription. You can sign up again afterwards and go through onboarding from scratch."
            : "Removes you from your workspace and deletes your sign-in. Your teammates keep the meetings and tasks; anything assigned to you stays, unassigned."}
          {" "}This cannot be undone.
        </p>
        <form action={deleteAccountAction} className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
          <div>
            <label>Type your email to confirm</label>
            <input name="confirm" type="email" placeholder={user.email} autoComplete="off" required />
          </div>
          <button className="btn-secondary !border-clay !text-clay hover:!bg-clay-soft">Delete account</button>
        </form>
      </section>
    </div>
  );
}
