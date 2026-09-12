import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { exchangeCode, syncConnection, type CalendarProvider } from "@/lib/calendar";
import { encrypt } from "@/lib/crypto";

export const maxDuration = 60;

export async function GET(req: Request, { params }: RouteContext<"/api/calendar/[provider]/callback">) {
  const { provider } = await params;
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const back = (q: string) => NextResponse.redirect(new URL(`/settings/calendar?${q}`, base));
  if (provider !== "google" && provider !== "microsoft") return back("error=unknown_provider");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("cal_oauth_state")?.value;
  jar.delete("cal_oauth_state");
  if (!code || !state || state !== expected) return back("error=state_mismatch");

  const { org, membership } = await requireOrg();
  try {
    const tok = await exchangeCode(provider as CalendarProvider, code);
    const conn = await db.calendarConnection.upsert({
      where: { memberId_provider_email: { memberId: membership.id, provider, email: tok.email } },
      update: {
        accessToken: encrypt(tok.access_token),
        refreshToken: encrypt(tok.refresh_token!),
        expiresAt: new Date(Date.now() + tok.expires_in * 1000),
        syncError: null,
      },
      create: {
        orgId: org.id,
        memberId: membership.id,
        provider,
        email: tok.email,
        accessToken: encrypt(tok.access_token),
        refreshToken: encrypt(tok.refresh_token!),
        expiresAt: new Date(Date.now() + tok.expires_in * 1000),
      },
    });
    await syncConnection(conn.id).catch((e) => console.error("initial sync failed", e));
    return back("connected=1");
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message : "oauth_failed")}`);
  }
}
