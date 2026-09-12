"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type OnboardingInput = {
  orgName: string;
  businessDescription?: string | null;
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
      onboardedAt: new Date(),
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
  redirect("/dashboard");
}

// ---------- Conversational onboarding ----------

import { emptyDraft, onboardingTurn, type ChatMessage, type OnboardingDraftData } from "@/lib/onboarding-ai";
import { safeJson } from "@/lib/utils";

export type ChatState = { messages: ChatMessage[]; draft: OnboardingDraftData };

async function loadState(userId: string, name: string, email: string): Promise<ChatState> {
  const row = await db.onboardingDraft.findUnique({ where: { userId } });
  if (row) return { messages: safeJson<ChatMessage[]>(row.messages, []), draft: safeJson<OnboardingDraftData>(row.draft, emptyDraft) };
  return { messages: [], draft: { ...emptyDraft, members: [{ name, email, role: "", responsibilities: "" }] } };
}

async function saveState(userId: string, state: ChatState) {
  await db.onboardingDraft.upsert({
    where: { userId },
    update: { messages: JSON.stringify(state.messages), draft: JSON.stringify(state.draft) },
    create: { userId, messages: JSON.stringify(state.messages), draft: JSON.stringify(state.draft) },
  });
}

export async function getOnboardingState(): Promise<ChatState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return loadState(user.id, user.name, user.email);
}

/** Send a user message (or a form submission) and get Scoop's reply. */
export async function onboardingChatAction(userMessage: string, draftPatch?: Partial<OnboardingDraftData>): Promise<ChatState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const state = await loadState(user.id, user.name, user.email);
  if (draftPatch) state.draft = { ...state.draft, ...draftPatch };
  const turn = await onboardingTurn({ history: state.messages, draft: state.draft, userMessage, userName: user.name, userEmail: user.email });
  const next: ChatState = {
    messages: [...state.messages, { role: "user", content: userMessage }, { role: "assistant", content: turn.reply, widget: turn.widget }],
    draft: turn.draft,
  };
  await saveState(user.id, next);
  return next;
}

/** Update the draft without a model turn (e.g. toggling a project checkbox). */
export async function patchOnboardingDraftAction(patch: Partial<OnboardingDraftData>): Promise<ChatState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const state = await loadState(user.id, user.name, user.email);
  state.draft = { ...state.draft, ...patch };
  await saveState(user.id, state);
  return state;
}

export async function resetOnboardingAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await db.onboardingDraft.deleteMany({ where: { userId: user.id } });
}

export async function finishFromDraftAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { draft } = await loadState(user.id, user.name, user.email);
  if (!draft.orgName) throw new Error("We still need your company name.");
  await completeOnboarding({
    orgName: draft.orgName,
    businessDescription: draft.businessDescription,
    members: draft.members.map((m) => ({ name: m.name, email: m.email ?? "", role: m.role, responsibilities: m.responsibilities })),
    projects: draft.projects.filter((p) => p.confirmed).map((p) => ({ name: p.name, description: p.description })),
  });
}

const PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
