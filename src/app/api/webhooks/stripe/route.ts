import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { applySubscription, stripe, stripeConfigured } from "@/lib/billing";
import { logActivity } from "@/lib/audit";

export const maxDuration = 60;

/**
 * Stripe webhook. Register https://<APP_URL>/api/webhooks/stripe in the Stripe
 * dashboard with these events and set STRIPE_WEBHOOK_SECRET:
 *   checkout.session.completed, customer.subscription.created,
 *   customer.subscription.updated, customer.subscription.deleted,
 *   invoice.paid, invoice.payment_failed
 */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 503 });

  const sig = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe().subscriptions.retrieve(subId);
          const org = await applySubscription(sub);
          if (org) await logActivity({ orgId: org.id, action: "billing.subscribed", entityType: "org", entityId: org.id, summary: `Subscription started (${sub.status})` });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const org = await applySubscription(event.data.object);
        if (org && event.type === "customer.subscription.deleted") {
          await logActivity({ orgId: org.id, action: "billing.canceled", entityType: "org", entityId: org.id, summary: "Subscription ended; recording paused" });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        const org = await db.organization.findUnique({ where: { stripeCustomerId: customerId } });
        if (org?.stripeSubscriptionId && org.billingStatus === "past_due") {
          await applySubscription(await stripe().subscriptions.retrieve(org.stripeSubscriptionId));
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        const org = await db.organization.findUnique({ where: { stripeCustomerId: customerId } });
        if (org && ["active", "trialing"].includes(org.billingStatus)) {
          await db.organization.update({ where: { id: org.id }, data: { billingStatus: "past_due" } });
          await logActivity({ orgId: org.id, action: "billing.payment_failed", entityType: "org", entityId: org.id, summary: "A payment failed. Update the card under Settings → Billing." });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook", event.type, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
