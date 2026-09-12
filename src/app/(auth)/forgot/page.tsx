"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, {});
  if (state.sent) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-slate-600">If an account exists for that address, a reset link is on its way. It&apos;s valid for one hour.</p>
        <Link className="text-sm text-indigo-600" href="/login">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <div><label>Email</label><input name="email" type="email" required autoComplete="email" autoFocus /></div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
      <p className="text-sm text-slate-500 text-center"><Link className="text-indigo-600" href="/login">Back to sign in</Link></p>
    </form>
  );
}
