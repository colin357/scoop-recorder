"use server";

import { redirect } from "next/navigation";
import { signIn, signUp, destroySession } from "@/lib/auth";

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
  redirect("/");
}

export async function signOutAction() {
  await destroySession();
  redirect("/login");
}
