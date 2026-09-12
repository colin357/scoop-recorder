"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/org";

export default function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="card p-5 grid gap-3">
      <h2 className="font-semibold">{hasPassword ? "Change password" : "Set a password"}</h2>
      {!hasPassword && <p className="text-sm text-muted">You signed up with Google or Microsoft. Setting a password lets you sign in either way.</p>}
      {hasPassword && <div><label>Current password</label><input name="current" type="password" autoComplete="current-password" /></div>}
      <div><label>New password</label><input name="next" type="password" minLength={8} autoComplete="new-password" required /></div>
      {state.error && <p className="text-sm text-clay">{state.error}</p>}
      {state.ok && <p className="text-sm text-grass">Password updated.</p>}
      <div><button className="btn-secondary" disabled={pending}>Update password</button></div>
    </form>
  );
}
