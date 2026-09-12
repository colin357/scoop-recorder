import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { CalendarProvider } from "@/lib/calendar";
import { socialExchange } from "@/lib/social-auth";
import { signInWithProvider } from "@/lib/auth";
import { appUrl } from "@/lib/urls";

export async function GET(req: Request, { params }: RouteContext<"/api/auth/[provider]/callback">) {
  const { provider } = await params;
  const base = appUrl();
  if (provider !== "google" && provider !== "microsoft") return NextResponse.redirect(new URL("/login?error=provider_unavailable", base));
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("auth_oauth_state")?.value;
  const next = jar.get("auth_next")?.value ?? "/";
  jar.delete("auth_oauth_state");
  jar.delete("auth_next");
  if (!code || !state || state !== expected) return NextResponse.redirect(new URL("/login?error=state_mismatch", base));
  try {
    const profile = await socialExchange(provider as CalendarProvider, code);
    await signInWithProvider(profile);
    return NextResponse.redirect(new URL(next, base));
  } catch (e) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(e instanceof Error ? e.message : "sign_in_failed")}`, base));
  }
}
