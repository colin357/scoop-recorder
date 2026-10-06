import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoMark } from "@/components/logo";
import OnboardingSetup from "./setup";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.memberships.length) redirect("/dashboard");
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 pt-5">
        <div className="mx-auto max-w-xl flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="font-display font-semibold">Scoop</span>
        </div>
      </header>
      <OnboardingSetup self={{ name: user.name, email: user.email }} />
    </main>
  );
}
