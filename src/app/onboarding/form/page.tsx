import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import OnboardingWizard from "./wizard";

export default async function OnboardingFormPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.memberships.length) redirect("/dashboard");
  return (
    <main className="flex-1 p-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/onboarding" className="text-sm text-slate-500 hover:text-slate-900">← Back to guided setup</Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Set up your team</h1>
        <p className="text-slate-500 mt-1">
          Tell Rocky who is on your team and what they handle. After each meeting the AI uses this to assign tasks to the right person.
        </p>
        <OnboardingWizard self={{ name: user.name, email: user.email }} />
      </div>
    </main>
  );
}
