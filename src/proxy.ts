import { NextResponse, type NextRequest } from "next/server";

/**
 * Send traffic that arrives on the *.vercel.app production alias to the
 * canonical domain (APP_URL), so cookies, OAuth callbacks and links all live on
 * one host. Preview deployments are left alone.
 */
export function proxy(request: NextRequest) {
  const canonical = process.env.APP_URL;
  if (!canonical || process.env.VERCEL_ENV !== "production") return NextResponse.next();
  const host = request.headers.get("host");
  const target = new URL(canonical);
  if (!host || host === target.host || !host.endsWith(".vercel.app")) return NextResponse.next();
  // Machine callers (Vercel Cron, webhooks) hit the deployment host directly
  // and do not follow redirects; API routes must answer on any host.
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const url = new URL(request.url);
  url.protocol = target.protocol;
  url.host = target.host;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
