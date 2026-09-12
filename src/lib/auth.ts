import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";

const COOKIE = "scoop_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: { memberships: { include: { org: true }, orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

/**
 * Current user, their membership, and org. Redirects to login/onboarding as needed.
 * Every member must connect a calendar before using the app (when a calendar
 * provider is configured); pass { skipCalendarGate: true } on the routes that
 * implement that step. Likewise the org must have started its subscription
 * (when Stripe is configured); pass { skipBillingGate: true } on /billing/start.
 */
export const requireOrg = cache(async (opts?: { skipCalendarGate?: boolean; skipBillingGate?: boolean }) => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = user.memberships[0];
  if (!membership) redirect("/onboarding");
  if (!opts?.skipBillingGate && billingRequired(membership.org.billingStatus) && !isSuperAdmin(user.email)) redirect("/billing/start");
  if (!opts?.skipCalendarGate && (await calendarRequired(membership.id))) redirect("/onboarding/calendar");
  return { user, membership, org: membership.org };
});

/** Operator accounts (SUPERADMIN_EMAILS) are never blocked by the billing gate, so they can reach /admin and comp organizations. */
export function isSuperAdmin(email: string) {
  return (process.env.SUPERADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

/** With Stripe configured, an organization must start its trial before using the app. */
export function billingRequired(billingStatus: string) {
  return Boolean(process.env.STRIPE_SECRET_KEY) && billingStatus === "none";
}

export const calendarRequired = cache(async (memberId: string) => {
  const { calendarProviderConfigured } = await import("./calendar");
  if (!calendarProviderConfigured("google") && !calendarProviderConfigured("microsoft")) return false;
  const count = await db.calendarConnection.count({ where: { memberId } });
  return count === 0;
});

/** Like requireOrg, but the member must be an admin. */
export async function requireAdmin() {
  const ctx = await requireOrg();
  if (!ctx.membership.isAdmin) redirect("/dashboard?error=admin_only");
  return ctx;
}

/** Find or create a user for a social sign-in and start a session. */
export async function signInWithProvider(input: { email: string; name: string }) {
  const email = input.email.toLowerCase();
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({ data: { email, name: input.name } });
    await db.membership.updateMany({ where: { email, userId: null }, data: { userId: user.id } });
  }
  await createSession(user.id);
  return user;
}

const RESET_HOURS = 1;

export async function createPasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return null; // don't reveal whether the account exists
  const token = randomBytes(32).toString("hex");
  await db.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: new Date(Date.now() + RESET_HOURS * 3600_000) },
  });
  return { user, token };
}

export async function consumePasswordReset(token: string, newPassword: string) {
  const user = await db.user.findUnique({ where: { passwordResetToken: token } });
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) throw new Error("This reset link is invalid or has expired.");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash, passwordResetToken: null, passwordResetExpires: null } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);
  return user;
}

export async function signUp(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with that email already exists.");
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await db.user.create({ data: { name: input.name.trim(), email, passwordHash } });
  // If an admin already invited this email into an org, attach the membership.
  await db.membership.updateMany({ where: { email, userId: null }, data: { userId: user.id } });
  await createSession(user.id);
  return user;
}

export async function signIn(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash) throw new Error("Invalid email or password.");
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password.");
  await createSession(user.id);
  return user;
}
