import { requireOrg } from "@/lib/auth";
import { checkoutPurchase } from "@/lib/billing";
import { Mascot } from "@/components/mascot";
import Started from "./started";

/**
 * Stripe Checkout returns here. It records the purchase (Meta Pixel) and
 * moves on to billing, before the calendar step can redirect and drop it.
 */
export default async function BillingStartedPage({ searchParams }: PageProps<"/billing/started">) {
  const { org } = await requireOrg({ skipBillingGate: true, skipCalendarGate: true });
  const sessionId = (await searchParams).session_id;
  const purchase = typeof sessionId === "string" ? await checkoutPurchase(org, sessionId) : null;
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Mascot pose="celebrate" size={96} />
      <p className="text-ink-soft">You&apos;re all set. One moment…</p>
      <Started purchase={purchase && typeof sessionId === "string" ? { ...purchase, id: sessionId } : null} />
    </main>
  );
}
