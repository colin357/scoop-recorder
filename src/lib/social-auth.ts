/**
 * "Sign in with Google / Microsoft" using the same OAuth apps as the calendar
 * integration, but with identity-only scopes.
 */
import { appUrl } from "./urls";
import type { CalendarProvider } from "./calendar";

export function socialAuthorizeUrl(provider: CalendarProvider, state: string) {
  const redirect = `${appUrl()}/api/auth/${provider}/callback`;
  if (provider === "google") {
    const p = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirect,
      response_type: "code",
      scope: "openid email profile",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }
  const p = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid email profile User.Read",
    response_mode: "query",
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${p}`;
}

export async function socialExchange(provider: CalendarProvider, code: string): Promise<{ email: string; name: string }> {
  const redirect = `${appUrl()}/api/auth/${provider}/callback`;
  const tokenUrl = provider === "google" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const creds = provider === "google"
    ? { client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET! }
    : { client_id: process.env.MICROSOFT_CLIENT_ID!, client_secret: process.env.MICROSOFT_CLIENT_SECRET! };
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...creds, grant_type: "authorization_code", code, redirect_uri: redirect }),
  });
  if (!res.ok) throw new Error(`${provider} sign-in failed: ${res.status}`);
  const tok = (await res.json()) as { access_token: string };
  const infoUrl = provider === "google" ? "https://www.googleapis.com/oauth2/v2/userinfo" : "https://graph.microsoft.com/v1.0/me";
  const info = await fetch(infoUrl, { headers: { Authorization: `Bearer ${tok.access_token}` } });
  if (!info.ok) throw new Error(`Could not read profile: ${info.status}`);
  const j = (await info.json()) as { email?: string; name?: string; mail?: string; userPrincipalName?: string; displayName?: string };
  const email = (j.email ?? j.mail ?? j.userPrincipalName ?? "").toLowerCase();
  if (!email) throw new Error("No email returned by provider");
  return { email, name: j.name ?? j.displayName ?? email.split("@")[0] };
}
