"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Meta Pixel. Page views are sent only for public pages (marketing, sign-up,
 * the add-a-card step), never from inside the app, where page addresses and
 * button labels can carry meeting and task details. Automatic event
 * detection is off, so the pixel sends only what we track explicitly:
 *   PageView              public pages
 *   CompleteRegistration  a new account reaches onboarding (once per browser)
 *   Purchase              subscription bought at checkout (/billing/started, via trackMeta),
 *                         with the plan's value and currency
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1397100318741972";

const PUBLIC_PATHS = ["/", "/signup", "/login", "/terms", "/privacy", "/billing/start"];

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; push: Fbq; loaded: boolean; version: string };
type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

/** Meta's standard loader: queue calls until fbevents.js arrives, then init once. */
function pixel(): Fbq {
  const w = window as PixelWindow;
  if (w.fbq) return w.fbq;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  w.fbq = n;
  w._fbq ??= n;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  n("set", "autoConfig", false, META_PIXEL_ID);
  n("init", META_PIXEL_ID);
  return n;
}

/** Send one standard event (loads the pixel if needed). `eventId` lets Meta drop duplicates. */
export function trackMeta(event: string, params?: Record<string, unknown>, eventId?: string) {
  pixel()("track", event, params ?? {}, eventId ? { eventID: eventId } : {});
}

/** True if this browser already sent the event; marks it sent otherwise. */
export function seen(key: string) {
  try {
    if (localStorage.getItem(key)) return true;
    localStorage.setItem(key, "1");
  } catch {}
  return false;
}

export default function MetaPixel() {
  const path = usePathname();

  useEffect(() => {
    const events: string[] = [];
    if (PUBLIC_PATHS.includes(path)) events.push("PageView");
    if (path === "/onboarding" && !seen("scoop.meta.registered")) events.push("CompleteRegistration");
    // Only load Meta's script when there's something to send.
    if (events.length) {
      const fbq = pixel();
      for (const e of events) fbq("track", e);
    }
  }, [path]);

  if (!PUBLIC_PATHS.includes(path)) return null;
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
    </noscript>
  );
}
