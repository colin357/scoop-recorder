"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { seen, trackMeta } from "@/components/meta-pixel";

export default function Started({ purchase }: { purchase: { id: string; value: number; currency: string } | null }) {
  const router = useRouter();
  useEffect(() => {
    // One Purchase per checkout, even if this page is reloaded.
    if (purchase && !seen(`scoop.meta.purchase.${purchase.id}`)) {
      trackMeta("Purchase", { value: purchase.value, currency: purchase.currency, content_name: "Scoop" }, purchase.id);
    }
    // Give the pixel a moment to send before leaving the page.
    const t = setTimeout(() => router.replace("/settings/billing?checkout=success"), 600);
    return () => clearTimeout(t);
  }, [router, purchase]);
  return null;
}
