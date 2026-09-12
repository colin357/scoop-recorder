/**
 * Canonical public origin of the app, e.g. https://www.scooprecorder.com.
 * Everything that needs an absolute URL (OAuth callbacks, Recall webhooks,
 * redirects) goes through here so the domain is defined in exactly one place.
 */
export function appUrl() {
  const raw = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

export function appHost() {
  return new URL(appUrl()).host;
}
