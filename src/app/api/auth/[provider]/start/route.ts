import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { calendarProviderConfigured, type CalendarProvider } from "@/lib/calendar";
import { socialAuthorizeUrl } from "@/lib/social-auth";
import { appUrl } from "@/lib/urls";

export async function GET(req: Request, { params }: RouteContext<"/api/auth/[provider]/start">) {
  const { provider } = await params;
  if ((provider !== "google" && provider !== "microsoft") || !calendarProviderConfigured(provider as CalendarProvider)) {
    return NextResponse.redirect(new URL("/login?error=provider_unavailable", appUrl()));
  }
  const next = new URL(req.url).searchParams.get("next") ?? "/";
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("auth_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  jar.set("auth_next", next.startsWith("/") ? next : "/", { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(socialAuthorizeUrl(provider as CalendarProvider, state));
}
