import { requireOrg } from "@/lib/auth";
import { updateProfileAction } from "@/app/actions/org";
import PasswordForm from "./password-form";

export default async function ProfilePage() {
  const { user, membership } = await requireOrg();
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      <form action={updateProfileAction} className="card p-5 grid gap-3">
        <div><label>Name</label><input name="name" defaultValue={user.name} /></div>
        <div><label>Email</label><input value={user.email} disabled /></div>
        <div>
          <label>Slack member ID (optional)</label>
          <input name="slackUserId" defaultValue={membership.slackUserId ?? ""} placeholder="U0123ABCD" />
          <p className="text-xs text-slate-500 mt-1">Lets Rocky @mention you in the team channel. Slack → your profile → ⋯ → Copy member ID.</p>
        </div>
        <label className="inline-flex items-center gap-2 font-normal"><input type="checkbox" name="notifyByEmail" defaultChecked={membership.notifyByEmail} className="!w-auto" />Email me when I&apos;m assigned a task or a summary is ready</label>
        <div><button className="btn-primary">Save</button></div>
      </form>
      <PasswordForm hasPassword={Boolean(user.passwordHash)} />
    </div>
  );
}
