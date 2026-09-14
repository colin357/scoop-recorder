"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE } from "@/lib/tz";

/**
 * Tells the server which time zone to format dates in. Writes the browser's
 * IANA zone to a cookie and refreshes once when it changes (first visit, or
 * after travelling), so server-rendered times match the viewer's clock.
 */
export default function TimezoneSync() {
  const router = useRouter();
  useEffect(() => {
    let tz: string | undefined;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return; }
    if (!tz) return;
    const current = document.cookie.match(new RegExp(`(?:^|; )${TZ_COOKIE.replace(".", "\\.")}=([^;]*)`))?.[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
