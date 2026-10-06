"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PRICING } from "@/lib/billing";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { resolveProvider } from "@/lib/llm";
import { suggestProjects } from "@/lib/onboarding-ai";

export type OnboardingInput = {
  orgName: string;
  businessDescription?: string | null;
  reviewBeforeAssign?: boolean;
  members: { name: string; email: string; role: string; responsibilities: string }[];
  projects: { name: string; description: string }[];
};

export async function completeOnboarding(input: OnboardingInput) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!input.orgName.trim()) throw new Error("Company name is required.");

  const base = slugify(input.orgName) || "team";
  let slug = base;
  for (let i = 2; await db.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const members = input.members
    .filter((m) => m.name.trim() && m.email.trim())
    .map((m) => ({ ...m, email: m.email.trim().toLowerCase() }));
  const selfIncluded = members.some((m) => m.email === user.email);

  await db.organization.create({
    data: {
      name: input.orgName.trim(),
      slug,
      businessDescription: input.businessDescription?.trim() || null,
      reviewBeforeAssign: Boolean(input.reviewBeforeAssign),
      onboardedAt: new Date(),
      retentionDays: PRICING.defaultRetentionDays,
      members: {
        create: [
          ...(selfIncluded
            ? []
            : [{ userId: user.id, email: user.email, name: user.name, role: "Admin", responsibilities: "Runs the team", isAdmin: true }]),
          ...(await Promise.all(
            members.map(async (m) => {
              const existing = await db.user.findUnique({ where: { email: m.email } });
              return {
                userId: existing?.id ?? null,
                email: m.email,
                name: m.name.trim(),
                role: m.role.trim() || "Team member",
                responsibilities: m.responsibilities.trim(),
                isAdmin: m.email === user.email,
              };
            }),
          )),
        ],
      },
      projects: {
        create: input.projects
          .filter((p) => p.name.trim())
          .map((p, i) => ({ name: p.name.trim(), description: p.description.trim() || null, color: PALETTE[i % PALETTE.length] })),
      },
    },
  });
  await db.onboardingDraft.deleteMany({ where: { userId: user.id } });
  redirect("/onboarding/calendar");
}

// ---------- Project ideas for the onboarding form ----------

/** A few project ideas from what the company does. Best effort: [] when the AI isn't available. */
export async function suggestStarterProjectsAction(about: string, orgName: string): Promise<{ name: string; description: string }[]> {
  const user = await getCurrentUser();
  if (!user || !resolveProvider() || !about.trim()) return [];
  try {
    const r = await suggestProjects({ businessDescription: `${orgName.slice(0, 120)}: ${about.slice(0, 1200)}`, existingProjects: [], recentMeetings: [] });
    return r.projects.slice(0, 6).map((p) => ({ name: p.name.slice(0, 60), description: p.description.slice(0, 200) }));
  } catch (e) {
    console.error("starter project ideas", e);
    return [];
  }
}

const PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
