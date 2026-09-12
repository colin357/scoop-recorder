"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptInviteSignupAction } from "@/app/actions/auth";

export default function InviteSignup({ token, email, name }: { token: string; email: string; name: string }) {
  const [state, action, pending] = useActionState(acceptInviteSignupAction.bind(null, token), {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <div><label>Email</label><input value={email} disabled /></div>
      <div><label>Your name</label><input name="name" defaultValue={name} required autoComplete="name" /></div>
      <div><label>Choose a password</label><input name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Joining…" : "Create account and join"}</button>
      <p className="text-sm text-slate-500 text-center">Already have an account? <Link className="text-indigo-600" href={`/login?next=/invite/${token}`}>Sign in</Link></p>
    </form>
  );
}
