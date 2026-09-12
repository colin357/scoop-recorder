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
 * implement that step.
 */
export const requireOrg = cache(async (opts?: { skipCalendarGate?: boolean }) => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = user.memberships[0];
  if (!membership) redirect("/onboarding");
  if (!opts?.skipCalendarGate && (await calendarRequired(membership.id))) redirect("/onboarding/calendar");
  return { user, membership, org: membership.org };
});

export const calendarRequired = cache(async (memberId: string) => {
  const { calendarProviderConfigured } = await import("./calendar");
  if (!calendarProviderConfigured("google") && !calendarProviderConfigured("microsoft")) return false;
  const count = await db.calendarConnection.count({ where: { memberId } });
  return count === 0;
});

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
