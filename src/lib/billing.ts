import Stripe from "stripe";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { db } from "./db";
import { appUrl } from "./urls";
import type { Organization } from "@/generated/prisma/client";

/**
 * Billing: one Stripe subscription per organization, priced per seat with
 * volume tiers, plus a pooled monthly recording allowance. Overage is invoiced
 * once a month (see /api/cron/bill-overage) so it works the same on monthly
 * and annual plans.
 *
 * Nothing here needs price IDs in env: the product, prices and portal config
 * are created in the connected Stripe account on first use and found again by
 * lookup key / metadata.
 */
export const PRICING = {
  /** Monthly USD per seat by seat-count band (volume pricing: the band applies to every seat). */
  tiers: [
    { upTo: 5, monthly: 25 },
    { upTo: 20, monthly: 22 },
    { upTo: 50, monthly: 20 },
    { upTo: null as number | null, monthly: 18 },
  ],
  annualDiscount: 0.2,
  includedHoursPerSeat: 20,
  overagePerHour: 1.5,
  trialDays: 14,
  trialHours: 5,
  defaultRetentionDays: 90,
};

export const ACTIVE_STATUSES = new Set(["trialing", "active", "past_due", "comped"]);

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Scoop", url: appUrl() } });
  return client;
}

/** Monthly price per seat for a given seat count. */
export function seatPrice(seats: number, interval: "month" | "year" = "month") {
  const tier = PRICING.tiers.find((t) => t.upTo === null || seats <= t.upTo)!;
  return interval === "year" ? tier.monthly * (1 - PRICING.annualDiscount) : tier.monthly;
}

export function annualPerSeatPerMonth(monthly: number) {
  return Math.round(monthly * (1 - PRICING.annualDiscount) * 100) / 100;
}

/** "$25" for whole dollars, "$17.60" otherwise. */
export function fmtUsd(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Catalog (product, prices, portal configuration), created on demand.

const LOOKUP = { month: "scoop_seat_monthly", year: "scoop_seat_annual" } as const;
type Catalog = { productId: string; month: string; year: string; portalConfigId: string };
let catalog: Catalog | null = null;

export async function ensureCatalog(): Promise<Catalog> {
  if (catalog) return catalog;
  const s = stripe();

  let product = (await s.products.search({ query: "active:'true' AND metadata['scoop']:'seat'" })).data[0];
  product ??= await s.products.create({
    name: "Scoop",
    description: "Per seat. 20 pooled recording hours per seat per month; overage $1.50/hour, invoiced monthly.",
    metadata: { scoop: "seat" },
  });

  const existing = await s.prices.list({ lookup_keys: [LOOKUP.month, LOOKUP.year], active: true, limit: 10 });
  const byKey = new Map(existing.data.map((p) => [p.lookup_key, p.id]));
  const tiersFor = (interval: "month" | "year"): Stripe.PriceCreateParams.Tier[] =>
    PRICING.tiers.map((t) => ({
      up_to: t.upTo ?? "inf",
      unit_amount: interval === "month" ? t.monthly * 100 : Math.round(t.monthly * (1 - PRICING.annualDiscount) * 12 * 100),
    }));
  for (const interval of ["month", "year"] as const) {
    if (byKey.has(LOOKUP[interval])) continue;
    const price = await s.prices.create({
      product: product.id,
      currency: "usd",
      nickname: interval === "month" ? "Seat, monthly" : "Seat, annual (20% off)",
      lookup_key: LOOKUP[interval],
      recurring: { interval },
      billing_scheme: "tiered",
      tiers_mode: "volume",
      tiers: tiersFor(interval),
    });
    byKey.set(LOOKUP[interval], price.id);
  }

  let portal = (await s.billingPortal.configurations.list({ active: true, limit: 100 })).data.find((c) => c.metadata?.scoop === "1");
  portal ??= await s.billingPortal.configurations.create({
    business_profile: { headline: "Scoop billing" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
      subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] } },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: [{ product: product.id, prices: [byKey.get(LOOKUP.month)!, byKey.get(LOOKUP.year)!] }],
      },
    },
    metadata: { scoop: "1" },
  });

  catalog = { productId: product.id, month: byKey.get(LOOKUP.month)!, year: byKey.get(LOOKUP.year)!, portalConfigId: portal.id };
  return catalog;
}

// ---------------------------------------------------------------------------
// Usage

/** Seats = members who have accepted (have a user account). Minimum 1. */
export async function seatCount(orgId: string) {
  const n = await db.membership.count({ where: { orgId, userId: { not: null } } });
  return Math.max(1, n);
}

/** Recorded hours in a window (bot-recorded meetings only; uploaded transcripts have no duration). */
export async function recordedHours(orgId: string, from: Date, to: Date) {
  const agg = await db.meeting.aggregate({ _sum: { durationSec: true }, where: { orgId, endedAt: { gte: from, lt: to }, durationSec: { not: null } } });
  return (agg._sum.durationSec ?? 0) / 3600;
}

export type BillingSnapshot = {
  configured: boolean;
  status: string;
  interval: "month" | "year" | null;
  seats: number;
  includedHours: number;
  usedHours: number;
  overageHours: number;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  monthKey: string;
  recording: { ok: true } | { ok: false; reason: string };
};

export async function billingSnapshot(org: Organization): Promise<BillingSnapshot> {
  const now = new Date();
  const usedHours = await recordedHours(org.id, startOfMonth(now), endOfMonth(now));
  const seats = Math.max(1, org.seats);
  const includedHours = seats * PRICING.includedHoursPerSeat;
  return {
    configured: stripeConfigured(),
    status: org.billingStatus,
    interval: (org.billingInterval as "month" | "year" | null) ?? null,
    seats,
    includedHours,
    usedHours,
    overageHours: Math.max(0, usedHours - includedHours),
    trialEndsAt: org.trialEndsAt,
    currentPeriodEnd: org.currentPeriodEnd,
    cancelAtPeriodEnd: org.cancelAtPeriodEnd,
    monthKey: format(now, "yyyy-MM"),
    recording: recordingGate(org, usedHours),
  };
}

function recordingGate(org: Organization, usedHoursThisMonth: number): BillingSnapshot["recording"] {
  if (!stripeConfigured()) return { ok: true };
  switch (org.billingStatus) {
    case "comped":
    case "active":
    case "past_due":
      return { ok: true };
    case "trialing":
      if (usedHoursThisMonth >= PRICING.trialHours) {
        return { ok: false, reason: `You've used the ${PRICING.trialHours} recording hours included in the free trial. Start your paid plan to keep recording.` };
      }
      return { ok: true };
    case "none":
      return { ok: false, reason: "Start your free trial to record meetings." };
    default:
      return { ok: false, reason: "Your subscription has ended, so recording is paused. Restart it under Settings → Billing." };
  }
}

/** Can this org send the recording bot right now? */
export async function recordingAllowed(org: Organization) {
  if (!stripeConfigured()) return { ok: true as const };
  if (["active", "past_due", "comped"].includes(org.billingStatus)) return { ok: true as const };
  const now = new Date();
  const used = await recordedHours(org.id, startOfMonth(now), endOfMonth(now));
  return recordingGate(org, used);
}

// ---------------------------------------------------------------------------
// Checkout / portal / subscription changes

async function ensureCustomer(org: Organization, email: string) {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe().customers.create({ name: org.name, email, metadata: { orgId: org.id } });
  await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function createCheckoutUrl(org: Organization, opts: { interval: "month" | "year"; email: string }) {
  const [cat, customer, seats] = await Promise.all([ensureCatalog(), ensureCustomer(org, opts.email), seatCount(org.id)]);
  const trialing = org.billingStatus === "none"; // one trial per organization
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: org.id,
    line_items: [{ price: cat[opts.interval], quantity: seats }],
    payment_method_collection: "always",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: {
      metadata: { orgId: org.id },
      ...(trialing ? { trial_period_days: PRICING.trialDays, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } } : {}),
    },
    success_url: `${appUrl()}/settings/billing?checkout=success`,
    cancel_url: `${appUrl()}/billing/start?canceled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPortalUrl(org: Organization, returnPath = "/settings/billing") {
  if (!org.stripeCustomerId) throw new Error("No billing account yet");
  const cat = await ensureCatalog();
  const session = await stripe().billingPortal.sessions.create({ customer: org.stripeCustomerId, configuration: cat.portalConfigId, return_url: `${appUrl()}${returnPath}` });
  return session.url;
}

/** End the trial now and start paying (used when the trial's recording allowance runs out). */
export async function endTrialNow(org: Organization) {
  if (!org.stripeSubscriptionId) throw new Error("No subscription");
  const sub = await stripe().subscriptions.update(org.stripeSubscriptionId, { trial_end: "now", proration_behavior: "none" });
  await applySubscription(sub);
}

/** Keep the Stripe seat quantity equal to accepted members. Best effort; never throws. */
export async function syncSeats(orgId: string) {
  try {
    if (!stripeConfigured()) return;
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org?.stripeSubscriptionId || !ACTIVE_STATUSES.has(org.billingStatus) || org.billingStatus === "comped") return;
    const seats = await seatCount(orgId);
    if (seats === org.seats) return;
    const sub = await stripe().subscriptions.retrieve(org.stripeSubscriptionId);
    const item = sub.items.data[0];
    if (!item) return;
    const updated = await stripe().subscriptions.update(sub.id, { items: [{ id: item.id, quantity: seats }], proration_behavior: "create_prorations" });
    await applySubscription(updated);
  } catch (e) {
    console.error("syncSeats failed", e);
  }
}

/** Mirror a Stripe subscription onto the organization. */
export async function applySubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const orgId = sub.metadata?.orgId;
  const org =
    (orgId ? await db.organization.findUnique({ where: { id: orgId } }) : null) ??
    (await db.organization.findFirst({ where: { OR: [{ stripeSubscriptionId: sub.id }, { stripeCustomerId: customerId }] } }));
  if (!org) {
    console.warn("Stripe subscription for unknown org", sub.id);
    return null;
  }
  // Ignore stale events about a subscription this org has since replaced.
  if (org.stripeSubscriptionId && org.stripeSubscriptionId !== sub.id && ["canceled", "incomplete_expired"].includes(sub.status)) return org;

  const item = sub.items.data[0];
  const status = ["incomplete", "incomplete_expired"].includes(sub.status) ? "none" : sub.status === "paused" ? "canceled" : sub.status;
  return db.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      billingStatus: org.billingStatus === "comped" ? "comped" : status,
      billingInterval: item?.price.recurring?.interval ?? org.billingInterval,
      seats: item?.quantity ?? org.seats,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : org.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    },
  });
}

// ---------------------------------------------------------------------------
// Monthly overage invoicing

/** Invoice last month's overage for every paying org. Idempotent per calendar month. */
export async function billOverageForLastMonth() {
  const s = stripe();
  const cat = await ensureCatalog();
  const lastMonth = subMonths(new Date(), 1);
  const from = startOfMonth(lastMonth);
  const to = endOfMonth(lastMonth);
  const monthKey = format(lastMonth, "yyyy-MM");
  const orgs = await db.organization.findMany({
    where: { stripeCustomerId: { not: null }, billingStatus: { in: ["active", "past_due", "trialing"] }, OR: [{ overageBilledThrough: null }, { overageBilledThrough: { lt: monthKey } }] },
  });
  const results: { orgId: string; hours: number; overage: number; invoiced: boolean }[] = [];
  for (const org of orgs) {
    const hours = await recordedHours(org.id, from, to);
    const overage = Math.max(0, hours - Math.max(1, org.seats) * PRICING.includedHoursPerSeat);
    let invoiced = false;
    if (overage >= 0.05 && org.billingStatus !== "trialing") {
      const qty = Math.ceil(overage * 100) / 100;
      const amount = Math.round(qty * PRICING.overagePerHour * 100);
      const invoice = await s.invoices.create({
        customer: org.stripeCustomerId!,
        collection_method: "charge_automatically",
        auto_advance: true,
        description: `Recording overage for ${format(lastMonth, "MMMM yyyy")}`,
        metadata: { orgId: org.id, month: monthKey, scoop: "overage" },
      });
      await s.invoiceItems.create({
        customer: org.stripeCustomerId!,
        invoice: invoice.id,
        currency: "usd",
        amount,
        description: `Recording overage: ${qty.toFixed(2)} h beyond ${Math.max(1, org.seats) * PRICING.includedHoursPerSeat} included h at $${PRICING.overagePerHour.toFixed(2)}/h (${format(lastMonth, "MMM yyyy")})`,
        metadata: { productId: cat.productId },
      });
      await s.invoices.finalizeInvoice(invoice.id);
      invoiced = true;
    }
    await db.organization.update({ where: { id: org.id }, data: { overageBilledThrough: monthKey } });
    results.push({ orgId: org.id, hours, overage, invoiced });
  }
  return { month: monthKey, results };
}
