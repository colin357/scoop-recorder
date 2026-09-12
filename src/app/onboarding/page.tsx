import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import OnboardingWizard from "./wizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.memberships.length) redirect("/dashboard");
  return (
    <main className="flex-1 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your team</h1>
        <p className="text-slate-500 mt-1">
          Tell Scoop who is on your team and what they handle. After each meeting the AI uses this to assign tasks to the right person.
        </p>
        <OnboardingWizard self={{ name: user.name, email: user.email }} />
      </div>
    </main>
  );
}
