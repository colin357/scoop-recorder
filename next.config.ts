import type { NextConfig } from "next";

// PostHog goes through our own domain (/ingest) so ad blockers don't drop it.
// NEXT_PUBLIC_POSTHOG_HOST picks the region (US by default; use https://eu.i.posthog.com for EU).
const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
const posthogAssets = posthogHost.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${posthogAssets}/static/:path*` },
      { source: "/ingest/array/:path*", destination: `${posthogAssets}/array/:path*` },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
  // PostHog's API uses trailing slashes.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
