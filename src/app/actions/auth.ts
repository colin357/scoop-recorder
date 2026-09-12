"use server";

import { redirect } from "next/navigation";
import { signIn, signUp, destroySession, createPasswordReset, consumePasswordReset, getCurrentUser } from "@/lib/auth";
import { sendEmail, templates } from "@/lib/email";
import { appUrl } from "@/lib/urls";
import { acceptInvite } from "./team";

export type AuthState = { error?: string };

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!name.trim() || !email.trim() || password.length < 8) {
    return { error: "Name, email and a password of at least 8 characters are required." };
  }
  try {
    await signUp({ name, email, password });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not sign up." };
  }
  redirect("/");
}

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  try {
    await signIn({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not sign in." };
  }
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") ? next : "/");
}

export async function signOutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_: AuthState & { sent?: boolean }, form: FormData): Promise<AuthState & { sent?: boolean }> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };
  const reset = await createPasswordReset(email);
  if (reset) {
    await sendEmail({ to: reset.user.email, ...templates.passwordReset({ link: `${appUrl()}/reset/${reset.token}` }) }).catch((e) => console.error("reset email failed", e));
  }
  return { sent: true }; // same response whether or not the account exists
}

export async function resetPasswordAction(token: string, _: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  try {
    await consumePasswordReset(token, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reset password." };
  }
  redirect("/");
}

/** Invitation accepted by someone without an account: create it and link the membership. */
export async function acceptInviteSignupAction(token: string, _: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "");
  const password = String(form.get("password") ?? "");
  const email = String(form.get("email") ?? "");
  if (!name.trim() || password.length < 8) return { error: "Name and a password of at least 8 characters are required." };
  try {
    const existing = await getCurrentUser();
    const user = existing ?? (await signUp({ name, email, password }));
    const res = await acceptInvite(token, user.id, user.email);
    if (res.error) return { error: res.error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not accept invitation." };
  }
  redirect("/");
}

/** Invitation accepted by a signed-in user. */
export async function acceptInviteAction(token: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/invite/${token}`);
  const res = await acceptInvite(token, user.id, user.email);
  if (res.error) redirect(`/invite/${token}?error=${encodeURIComponent(res.error)}`);
  redirect("/");
}
