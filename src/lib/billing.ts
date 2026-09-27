import Stripe from "stripe";
import { addDays, endOfMonth, format, max as maxDate, startOfMonth, subMonths } from "date-fns";
import { db } from "./db";
import { appUrl } from "./urls";
import type { Organization } from "@/generated/prisma/client";

/**
 * Billing: one Stripe subscription per organization.
 *
 *   Scoop           $20 per person / month ($16 billed annually). Unlimited
 *                   meetings under a fair-use policy (~20 h per person per
 *                   month, averaged across the team; see the Terms).
 *   Phone add-on    $25 / month per workspace, 6 h of calls included, then
 *                   $3.50 per extra hour, invoiced on the 1st of the next month.
 *   Free trial      14 days, no card. 5 recording hours (meetings and calls).
 *
 * The trial lives only in our database (status "trialing", no subscription).
 * Adding a card at any point starts the Stripe subscription, keeping whatever
 * trial time is left. Organizations on the old Starter/Team prices keep them
 * until they switch.
 *
 * Nothing here needs price IDs in env: products, prices and the portal config
 * are created in the connected Stripe account on first use and found again by
 * lookup key / metadata.
 */
export type Interval = "month" | "year";

export const PRICING = {
  seatMonthly: 20,
  seatAnnualMonthly: 16,
  fairUseHoursPerSeat: 20,
  trialDays: 14,
  trialHours: 5,
  phoneMonthly: 25,
  // The add-on has to match the subscription's interval, so annual plans get an annual add-on price.
  phoneAnnualMonthly: 20,
  phoneIncludedHours: 6,
  phoneOveragePerHour: 3.5,
  defaultRetentionDays: 90,
};

/** Grandfathered plans. Existing subscribers keep these prices until they switch. */
const LEGACY_PLANS: Record<string, { name: string; monthly: number }> = {
  starter: { name: "Starter", monthly: 15 },
  team: { name: "Team", monthly: 25 },
};

export const ACTIVE_STATUSES = new Set(["trialing", "active", "past_due", "comped"]);

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  // STRIPE_API_BASE points the SDK at a local stand-in for tests.
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
  const host = base ? { host: base.hostname, port: Number(base.port || (base.protocol === "http:" ? 80 : 443)), protocol: base.protocol === "http:" ? ("http" as const) : ("https" as const) } : {};
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Scoop", url: appUrl() }, ...host });
  return client;
}

export function legacyPlan(key: string | null | undefined) {
  return key ? (LEGACY_PLANS[key] ?? null) : null;
}

/** Per-person price per month on the current plan. */
export function seatPrice(interval: Interval = "month") {
  return interval === "year" ? PRICING.seatAnnualMonthly : PRICING.seatMonthly;
}

/** What this organization pays per person per month (legacy plans included). */
export function orgSeatPrice(org: Pick<Organization, "billingPlan" | "billingInterval">) {
  const interval = (org.billingInterval as Interval | null) ?? "month";
  const legacy = legacyPlan(org.billingPlan);
  if (!legacy) return seatPrice(interval);
  return interval === "year" ? Math.round(legacy.monthly * 0.8 * 100) / 100 : legacy.monthly;
}

export function phonePrice(interval: Interval = "month") {
  return interval === "year" ? PRICING.phoneAnnualMonthly : PRICING.phoneMonthly;
}

/** "$25" for whole dollars, "$17.60" otherwise. */
export function fmtUsd(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Trial (no card)

/** Fields for a brand-new organization: the free trial starts right away. */
export function newTrialFields(now = new Date()) {
  if (!stripeConfigured()) return {};
  return { billingStatus: "trialing", trialEndsAt: addDays(now, PRICING.trialDays) };
}

/** On the no-card trial (no Stripe subscription yet). */
export function isLocalTrial(org: Pick<Organization, "billingStatus" | "stripeSubscriptionId">) {
  return org.billingStatus === "trialing" && !org.stripeSubscriptionId;
}

/** The no-card trial ran out and no card was added. */
export function trialExpired(org: Pick<Organization, "billingStatus" | "stripeSubscriptionId" | "trialEndsAt">, now = new Date()) {
  return isLocalTrial(org) && (!org.trialEndsAt || org.trialEndsAt <= now);
}

/**
 * Organizations created before the no-card trial (status "none", never
 * trialed) get their trial the first time someone opens the app.
 */
export async function ensureTrialStarted(org: Organization) {
  if (!stripeConfigured() || org.billingStatus !== "none" || org.trialEndsAt || org.stripeSubscriptionId) return org;
  const fields = newTrialFields();
  await db.organization.updateMany({ where: { id: org.id, billingStatus: "none", trialEndsAt: null }, data: fields });
  return Object.assign(org, fields);
}

function trialStart(org: Pick<Organization, "trialEndsAt">) {
  return org.trialEndsAt ? addDays(org.trialEndsAt, -PRICING.trialDays) : new Date(0);
}

// ---------------------------------------------------------------------------
// Catalog (seat product + phone add-on product, two prices each, portal
// configuration), created on demand.

type Kind = "seat" | "phone";
const PRICE_KEYS: Record<`${Kind}:${Interval}`, string> = {
  "seat:month": "scoop_seat_monthly_2026",
  "seat:year": "scoop_seat_annual_2026",
  "phone:month": "scoop_phone_monthly_2026",
  "phone:year": "scoop_phone_annual_2026",
};
const PRODUCTS: Record<Kind, { name: string; description: string; month: number; year: number; nickname: string }> = {
  seat: {
    name: "Scoop",
    description: "Per person. Unlimited meetings, summaries, tasks and Ask Rocky (fair use applies).",
    month: PRICING.seatMonthly,
    year: PRICING.seatAnnualMonthly * 12,
    nickname: "Scoop, per person",
  },
  phone: {
    name: "Scoop phone calls",
    description: `Record phone calls. ${PRICING.phoneIncludedHours} hours of calls a month included; extra hours $${PRICING.phoneOveragePerHour.toFixed(2)} each, invoiced monthly.`,
    month: PRICING.phoneMonthly,
    year: PRICING.phoneAnnualMonthly * 12,
    nickname: "Phone calls add-on",
  },
};
type Catalog = { products: Record<Kind, string>; prices: Record<`${Kind}:${Interval}`, string>; portalConfigId: string };
let catalog: Catalog | null = null;

export async function ensureCatalog(): Promise<Catalog> {
  if (catalog) return catalog;
  const s = stripe();

  // Prices are the source of truth: lookup keys are unique across the account.
  const existing = await s.prices.list({ lookup_keys: Object.values(PRICE_KEYS), active: true, limit: 20, expand: ["data.product"] });
  const byKey = new Map(existing.data.map((p) => [p.lookup_key, p]));
  const productOf = (p: Stripe.Price) => (typeof p.product === "string" ? null : p.product.deleted ? null : p.product);

  const products = {} as Catalog["products"];
  const prices = {} as Catalog["prices"];
  for (const kind of ["seat", "phone"] as const) {
    const def = PRODUCTS[kind];
    const owned = (["month", "year"] as const).map((i) => byKey.get(PRICE_KEYS[`${kind}:${i}`])).find((p) => p && productOf(p)?.metadata?.scoop === kind);
    let productId = owned ? (productOf(owned) as Stripe.Product).id : null;
    if (!productId) {
      const product = await s.products.create({ name: def.name, description: def.description, metadata: { scoop: kind, ...(kind === "seat" ? { plan: "standard" } : {}) } });
      productId = product.id;
    }
    products[kind] = productId;

    for (const interval of ["month", "year"] as const) {
      const key = PRICE_KEYS[`${kind}:${interval}`];
      const current = byKey.get(key);
      if (current && productOf(current)?.id === productId) {
        prices[`${kind}:${interval}`] = current.id;
        continue;
      }
      const created = await s.prices.create({
        product: productId,
        currency: "usd",
        nickname: `${def.nickname}, ${interval === "month" ? "monthly" : "annual"}`,
        lookup_key: key,
        transfer_lookup_key: true,
        recurring: { interval },
        unit_amount: Math.round((interval === "month" ? def.month : def.year) * 100),
        metadata: { kind, ...(kind === "seat" ? { plan: "standard" } : {}) },
      });
      if (current) await s.prices.update(current.id, { active: false });
      prices[`${kind}:${interval}`] = created.id;
    }
  }

  // Portal config: monthly <-> annual on the seat product. (Stripe's portal
  // can't change subscriptions with more than one item, so the phone add-on
  // is switched on and off in the app.)
  const productList = [{ product: products.seat, prices: [prices["seat:month"], prices["seat:year"]] }];
  const wanted = new Set(productList[0].prices);
  const portalFeatures: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
    subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] } },
    subscription_update: { enabled: true, default_allowed_updates: ["price"], proration_behavior: "create_prorations", products: productList },
  };
  let portal = (await s.billingPortal.configurations.list({ active: true, limit: 100 })).data.find((c) => c.metadata?.scoop === "4");
  if (portal) {
    const listed = new Set((portal.features.subscription_update?.products ?? []).flatMap((p) => p.prices));
    if (listed.size !== wanted.size || [...wanted].some((id) => !listed.has(id))) {
      portal = await s.billingPortal.configurations.update(portal.id, { features: portalFeatures });
    }
  } else {
    portal = await s.billingPortal.configurations.create({ business_profile: { headline: "Scoop billing" }, features: portalFeatures, metadata: { scoop: "4" } });
  }

  catalog = { products, prices, portalConfigId: portal.id };
  return catalog;
}

const isPhonePrice = (p: Stripe.Price) => p.metadata?.kind === "phone" || Boolean(p.lookup_key?.startsWith("scoop_phone_"));
const seatItemOf = (sub: Stripe.Subscription) => sub.items.data.find((i) => !isPhonePrice(i.price)) ?? null;
const phoneItemOf = (sub: Stripe.Subscription) => sub.items.data.find((i) => isPhonePrice(i.price)) ?? null;

function planOfPrice(p: Stripe.Price) {
  if (p.metadata?.plan) return p.metadata.plan;
  const legacy = Object.keys(LEGACY_PLANS).find((k) => p.lookup_key?.startsWith(`scoop_${k}_`));
  return legacy ?? (p.lookup_key?.startsWith("scoop_seat_") ? "standard" : null);
}

// ---------------------------------------------------------------------------
// Usage

/** Seats = members who have accepted (have a user account). Minimum 1. */
export async function seatCount(orgId: string) {
  const n = await db.membership.count({ where: { orgId, userId: { not: null } } });
  return Math.max(1, n);
}

async function sumHours(where: object) {
  const r = await db.meeting.aggregate({ _sum: { durationSec: true }, where: { durationSec: { not: null }, ...where } });
  return (r._sum.durationSec ?? 0) / 3600;
}

/** Recorded hours in a window, meetings and calls (uploaded transcripts have no duration). */
export async function recordedHours(orgId: string, from: Date, to: Date) {
  return sumHours({ orgId, endedAt: { gte: from, lt: to } });
}

/** Recorded phone-call hours in a window. */
export async function phoneHours(orgId: string, from: Date, to: Date) {
  return sumHours({ orgId, platform: "phone", endedAt: { gte: from, lt: to } });
}

/** Hours recorded since the trial started (meetings and calls). */
export async function trialHoursUsed(org: Pick<Organization, "id" | "trialEndsAt">) {
  return recordedHours(org.id, trialStart(org), new Date(Date.now() + 60_000));
}

/** Phone hours that count against the add-on this month (calls before the add-on was on don't). */
async function addonPhoneHours(org: Pick<Organization, "id" | "phoneAddonSince">, month: Date) {
  const from = org.phoneAddonSince ? maxDate([startOfMonth(month), org.phoneAddonSince]) : startOfMonth(month);
  return phoneHours(org.id, from, endOfMonth(month));
}

export type BillingSnapshot = {
  configured: boolean;
  /** billingStatus, plus "trial_ended" for a no-card trial that ran out. */
  status: string;
  /** The grandfathered plan, when the org is still on one. */
  legacy: { key: string; name: string } | null;
  interval: Interval | null;
  seats: number;
  perSeat: number;
  hasCard: boolean;
  usedHours: number;
  fairUseHours: number;
  trial: { usedHours: number; limitHours: number; endsAt: Date | null; local: boolean } | null;
  phone: { enabled: boolean; allowed: boolean; perMonth: number; includedHours: number; usedHours: number; overageHours: number; overageCost: number };
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  monthKey: string;
  recording: { ok: true } | { ok: false; reason: string };
};

export async function billingSnapshot(org: Organization): Promise<BillingSnapshot> {
  const now = new Date();
  const trialing = org.billingStatus === "trialing";
  const [usedHours, trialUsed, addonHours] = await Promise.all([
    recordedHours(org.id, startOfMonth(now), endOfMonth(now)),
    trialing ? trialHoursUsed(org) : Promise.resolve(0),
    org.phoneAddonItemId ? addonPhoneHours(org, now) : Promise.resolve(0),
  ]);
  const seats = Math.max(1, org.seats);
  const interval = (org.billingInterval as Interval | null) ?? null;
  const legacy = legacyPlan(org.billingPlan);
  const phoneOverage = Math.max(0, addonHours - PRICING.phoneIncludedHours);
  return {
    configured: stripeConfigured(),
    status: trialExpired(org, now) ? "trial_ended" : org.billingStatus,
    legacy: legacy ? { key: org.billingPlan!, name: legacy.name } : null,
    interval,
    seats,
    perSeat: orgSeatPrice(org),
    hasCard: Boolean(org.stripeSubscriptionId),
    usedHours,
    fairUseHours: seats * PRICING.fairUseHoursPerSeat,
    trial: trialing ? { usedHours: trialUsed, limitHours: PRICING.trialHours, endsAt: org.trialEndsAt, local: isLocalTrial(org) } : null,
    phone: {
      enabled: Boolean(org.phoneAddonItemId),
      allowed: phoneAccess(org).ok,
      perMonth: phonePrice(interval ?? "month"),
      includedHours: PRICING.phoneIncludedHours,
      usedHours: addonHours,
      overageHours: phoneOverage,
      overageCost: Math.round(phoneOverage * PRICING.phoneOveragePerHour * 100) / 100,
    },
    trialEndsAt: org.trialEndsAt,
    currentPeriodEnd: org.currentPeriodEnd,
    cancelAtPeriodEnd: org.cancelAtPeriodEnd,
    monthKey: format(now, "yyyy-MM"),
    recording: recordingGate(org, trialUsed),
  };
}

function recordingGate(org: Organization, trialUsedHours: number): BillingSnapshot["recording"] {
  if (!stripeConfigured()) return { ok: true };
  switch (org.billingStatus) {
    case "comped":
    case "active":
    case "past_due":
      return { ok: true };
    case "trialing":
      if (trialExpired(org)) return { ok: false, reason: "Your free trial has ended. Add a card to keep recording." };
      if (trialUsedHours >= PRICING.trialHours) {
        return {
          ok: false,
          reason: isLocalTrial(org)
            ? `You've used the ${PRICING.trialHours} recording hours in the free trial. Add a card to keep recording.`
            : `You've used the ${PRICING.trialHours} recording hours in the free trial. Start your paid plan to keep recording.`,
        };
      }
      return { ok: true };
    case "none":
      return { ok: false, reason: "Start your free trial to record meetings." };
    default:
      return { ok: false, reason: "Your subscription has ended, so recording is paused. Restart it under Settings → Billing." };
  }
}

/** Can this org record a meeting or call right now? */
export async function recordingAllowed(org: Organization) {
  if (!stripeConfigured()) return { ok: true as const };
  if (["active", "past_due", "comped"].includes(org.billingStatus)) return { ok: true as const };
  const used = org.billingStatus === "trialing" && !trialExpired(org) ? await trialHoursUsed(org) : 0;
  return recordingGate(org, used);
}

/**
 * Phone calls: included in the trial and for complimentary workspaces,
 * otherwise they need the add-on. (Recording hours are checked separately.)
 */
export function phoneAccess(org: Organization): { ok: true } | { ok: false; reason: string; upsell: boolean } {
  if (!stripeConfigured()) return { ok: true };
  if (org.billingStatus === "comped" || org.billingStatus === "trialing" || org.phoneAddonItemId) return { ok: true };
  if (["active", "past_due"].includes(org.billingStatus)) {
    return { ok: false, upsell: true, reason: `Phone calls are an add-on: ${fmtUsd(PRICING.phoneMonthly)}/month with ${PRICING.phoneIncludedHours} hours of calls. An admin can turn it on under Settings → Billing.` };
  }
  return { ok: false, upsell: false, reason: "Your subscription has ended, so recording is paused. Restart it under Settings → Billing." };
}

// ---------------------------------------------------------------------------
// Checkout / portal / subscription changes

async function ensureCustomer(org: Organization, email: string) {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe().customers.create({ name: org.name, email, metadata: { orgId: org.id } });
  await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Stripe needs a trial to end at least 48 hours out; keep a little margin. */
const MIN_TRIAL_MS = 49 * 3600_000;

/** When adding a card now, the date the first charge would happen (end of the no-card trial), or null for today. */
export async function trialKeptAtCheckout(org: Organization) {
  if (!isLocalTrial(org) || !org.trialEndsAt || org.trialEndsAt.getTime() - Date.now() < MIN_TRIAL_MS) return null;
  return (await trialHoursUsed(org)) < PRICING.trialHours ? org.trialEndsAt : null;
}

/**
 * Add a card and start the subscription. During the no-card trial the
 * remaining trial time is kept (unless the trial hours are used up, in which
 * case the plan starts now).
 */
export async function createCheckoutUrl(org: Organization, opts: { interval: Interval; email: string }) {
  if (org.stripeSubscriptionId && ["active", "past_due", "trialing"].includes(org.billingStatus)) throw new Error("This workspace already has a subscription.");
  const [cat, customer, seats] = await Promise.all([ensureCatalog(), ensureCustomer(org, opts.email), seatCount(org.id)]);
  const keep = await trialKeptAtCheckout(org);
  const trialEnd = keep ? Math.floor(keep.getTime() / 1000) : null;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: org.id,
    line_items: [{ price: cat.prices[`seat:${opts.interval}`], quantity: seats }],
    payment_method_collection: "always",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: { metadata: { orgId: org.id }, ...(trialEnd ? { trial_end: trialEnd } : {}) },
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

/** Move a grandfathered Starter/Team subscription onto the current per-person price. */
export async function switchToCurrentPlan(org: Organization) {
  if (!org.stripeSubscriptionId) throw new Error("No subscription");
  const cat = await ensureCatalog();
  const sub = await stripe().subscriptions.retrieve(org.stripeSubscriptionId);
  const seat = seatItemOf(sub);
  if (!seat) throw new Error("Subscription has no seat item");
  const interval: Interval = seat.price.recurring?.interval === "year" ? "year" : "month";
  const updated = await stripe().subscriptions.update(sub.id, {
    items: [{ id: seat.id, price: cat.prices[`seat:${interval}`], quantity: await seatCount(org.id) }],
    proration_behavior: "create_prorations",
  });
  await applySubscription(updated);
}

/** Turn the phone-calls add-on on or off (prorated). */
export async function setPhoneAddon(org: Organization, on: boolean) {
  if (!org.stripeSubscriptionId) throw new Error("Add a card first, then turn on phone calls.");
  const cat = await ensureCatalog();
  const s = stripe();
  const sub = await s.subscriptions.retrieve(org.stripeSubscriptionId);
  const current = phoneItemOf(sub);
  if (on && !current) {
    const interval: Interval = seatItemOf(sub)?.price.recurring?.interval === "year" ? "year" : "month";
    await s.subscriptionItems.create({ subscription: sub.id, price: cat.prices[`phone:${interval}`], quantity: 1, proration_behavior: "create_prorations" });
  } else if (!on && current) {
    await s.subscriptionItems.del(current.id, { proration_behavior: "create_prorations" });
  }
  await applySubscription(await s.subscriptions.retrieve(sub.id));
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
    const item = seatItemOf(sub);
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
  // An abandoned checkout must not knock a workspace off its no-card trial.
  if (["incomplete", "incomplete_expired"].includes(sub.status) && isLocalTrial(org)) return org;

  const seat = seatItemOf(sub);
  const phone = ["canceled", "incomplete_expired"].includes(sub.status) ? null : phoneItemOf(sub);
  const status = ["incomplete", "incomplete_expired"].includes(sub.status) ? "none" : sub.status === "paused" ? "canceled" : sub.status;
  return db.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      billingStatus: org.billingStatus === "comped" ? "comped" : status,
      billingPlan: (seat && planOfPrice(seat.price)) ?? org.billingPlan,
      billingInterval: seat?.price.recurring?.interval ?? org.billingInterval,
      seats: seat?.quantity ?? org.seats,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      currentPeriodEnd: seat?.current_period_end ? new Date(seat.current_period_end * 1000) : org.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      phoneAddonItemId: phone?.id ?? null,
      phoneAddonSince: phone ? (org.phoneAddonItemId === phone.id && org.phoneAddonSince ? org.phoneAddonSince : new Date(phone.created * 1000)) : null,
    },
  });
}

// ---------------------------------------------------------------------------
// Monthly phone overage invoicing

/** Invoice last month's phone-call hours beyond the add-on allowance. Idempotent per calendar month. */
export async function billPhoneOverageForLastMonth() {
  const s = stripe();
  const lastMonth = subMonths(new Date(), 1);
  const monthKey = format(lastMonth, "yyyy-MM");
  const orgs = await db.organization.findMany({
    where: {
      stripeCustomerId: { not: null },
      phoneAddonItemId: { not: null },
      billingStatus: { in: ["active", "past_due", "trialing"] },
      OR: [{ overageBilledThrough: null }, { overageBilledThrough: { lt: monthKey } }],
    },
  });
  const results: { orgId: string; hours: number; overage: number; invoiced: boolean }[] = [];
  for (const org of orgs) {
    const hours = await addonPhoneHours(org, lastMonth);
    const overage = Math.max(0, hours - PRICING.phoneIncludedHours);
    let invoiced = false;
    // Calls during a trial are free.
    if (overage >= 0.05 && org.billingStatus !== "trialing") {
      const qty = Math.ceil(overage * 100) / 100;
      const invoice = await s.invoices.create({
        customer: org.stripeCustomerId!,
        collection_method: "charge_automatically",
        auto_advance: true,
        description: `Phone calls beyond the included ${PRICING.phoneIncludedHours} hours, ${format(lastMonth, "MMMM yyyy")}`,
        metadata: { orgId: org.id, month: monthKey, scoop: "phone_overage" },
      });
      await s.invoiceItems.create({
        customer: org.stripeCustomerId!,
        invoice: invoice.id,
        currency: "usd",
        amount: Math.round(qty * PRICING.phoneOveragePerHour * 100),
        description: `Phone calls: ${qty.toFixed(2)} h beyond ${PRICING.phoneIncludedHours} included h at $${PRICING.phoneOveragePerHour.toFixed(2)}/h (${format(lastMonth, "MMM yyyy")})`,
      });
      await s.invoices.finalizeInvoice(invoice.id);
      invoiced = true;
    }
    await db.organization.update({ where: { id: org.id }, data: { overageBilledThrough: monthKey } });
    results.push({ orgId: org.id, hours, overage, invoiced });
  }
  return { month: monthKey, results };
}
