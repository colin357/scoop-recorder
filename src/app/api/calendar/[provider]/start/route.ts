import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { requireOrg } from "@/lib/auth";
import { authorizeUrl, calendarProviderConfigured, type CalendarProvider } from "@/lib/calendar";
import { appUrl } from "@/lib/urls";

export async function GET(_req: Request, { params }: RouteContext<"/api/calendar/[provider]/start">) {
  const { provider } = await params;
  if (provider !== "google" && provider !== "microsoft") return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  await requireOrg();
  if (!calendarProviderConfigured(provider as CalendarProvider)) {
    return NextResponse.redirect(new URL("/settings/calendar?error=not_configured", appUrl()));
  }
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("cal_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(authorizeUrl(provider as CalendarProvider, state));
}
