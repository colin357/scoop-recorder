"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";

export default function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, token), {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      <div><label>New password</label><input name="password" type="password" required minLength={8} autoComplete="new-password" autoFocus /></div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save and sign in"}</button>
    </form>
  );
}
