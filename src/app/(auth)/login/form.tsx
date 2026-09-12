"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/app/actions/auth";

export default function LoginForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <h1 className="text-lg font-semibold">Sign in</h1>
      <div><label>Email</label><input name="email" type="email" required autoComplete="email" /></div>
      <div><label>Password</label><input name="password" type="password" required autoComplete="current-password" /></div>
      {state.error && <p className="text-sm text-clay">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-sm text-center"><Link className="text-muted hover:text-merle" href="/forgot">Forgot your password?</Link></p>
      <p className="text-sm text-muted text-center">
        New here? <Link className="text-merle" href="/signup">Create an account</Link>
      </p>
    </form>
  );
}
