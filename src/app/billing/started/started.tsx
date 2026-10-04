"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackMeta } from "@/components/meta-pixel";

export default function Started() {
  const router = useRouter();
  useEffect(() => {
    trackMeta("StartTrial");
    // Give the pixel a moment to send before leaving the page.
    const t = setTimeout(() => router.replace("/settings/billing?checkout=success"), 600);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
