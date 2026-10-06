"use client";

import posthog from "posthog-js";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * PostHog product analytics and session replay (off unless
 * NEXT_PUBLIC_POSTHOG_KEY is set). Page views and time on page are automatic.
 *
 * Privacy: inside the app, where pages show meetings, transcripts and tasks,
 * the app's content area carries the `ph-mask` class, so recordings show the
 * layout and clicks but not the words, and clicked-element text isn't sent.
 * Typed input is masked everywhere.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");

// Signed-in app pages (everything else is marketing, sign-up, onboarding or billing).
const APP_PREFIXES = ["/dashboard", "/meetings", "/calls", "/tasks", "/projects", "/settings", "/search", "/admin", "/deleted"];
const inApp = (path: string) => APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

const MASKED_ATTRIBUTES = new Set(["title", "aria-label", "alt", "data-tooltip"]);

let started = false;
const identified = () => posthog.get_property("$user_state") === "identified";
function start() {
  if (started || !KEY || typeof window === "undefined") return started;
  posthog.init(KEY, {
    api_host: "/ingest",
    ui_host: HOST.replace(".i.posthog.com", ".posthog.com"),
    defaults: "2026-08-30", // page views on client-side navigation, current recommended behaviour
    capture_pageleave: true,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: ".ph-mask",
      // Tooltips and labels can carry names and titles too (avatars, chips), so mask those as well.
      maskAttributeFn: (name, value, element) =>
        MASKED_ATTRIBUTES.has(name) && element?.closest(".ph-mask") ? value.replace(/\S/g, "*") : value,
    },
  });
  started = true;
  return true;
}

/** Send a custom event (no-op when PostHog isn't configured). */
export function track(event: string, properties?: Record<string, unknown>) {
  if (start()) posthog.capture(event, properties);
}

/** Root-level: starts PostHog and keeps clicked-element text out of events inside the app. */
export default function Analytics() {
  const path = usePathname();
  useEffect(() => {
    if (!start()) return;
    posthog.set_config({ mask_all_text: inApp(path), mask_all_element_attributes: inApp(path) });
    // A signed-out visitor starts fresh, so the next person on this browser isn't merged with the last.
    if ((path === "/login" || path === "/signup") && identified()) posthog.reset();
  }, [path]);
  return null;
}

/** Ties events and recordings to the signed-in person and their workspace. */
export function IdentifyUser({ id, email, name, org }: { id: string; email: string; name: string; org?: { id: string; name: string } }) {
  useEffect(() => {
    if (!start()) return;
    if (identified() && posthog.get_distinct_id() !== id) posthog.reset();
    posthog.identify(id, { email, name });
    if (org) posthog.group("company", org.id, { name: org.name });
  }, [id, email, name, org?.id, org?.name, org]);
  return null;
}
