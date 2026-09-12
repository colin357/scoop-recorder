"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/app/actions/auth";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-lg font-semibold">Create your account</h1>
      <div><label>Your name</label><input name="name" required autoComplete="name" /></div>
      <div><label>Work email</label><input name="email" type="email" required autoComplete="email" /></div>
      <div><label>Password</label><input name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
      {state.error && <p className="text-sm text-clay">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Continue"}</button>
      <p className="text-xs text-muted text-center">
        By continuing you agree to the <Link className="text-merle" href="/terms">Terms of Service</Link> and <Link className="text-merle" href="/privacy">Privacy Policy</Link>.
      </p>
      <p className="text-sm text-muted text-center">
        Already have an account? <Link className="text-merle" href="/login">Sign in</Link>
      </p>
    </form>
  );
}
