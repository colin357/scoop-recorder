import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { resolveProvider } from "@/lib/llm";
import { getOnboardingState } from "@/app/actions/onboarding";
import OnboardingChat from "./chat";
import { Mascot } from "@/components/mascot";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.memberships.length) redirect("/dashboard");
  if (!resolveProvider()) redirect("/onboarding/form");
  const state = await getOnboardingState();
  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b-2 border-ink bg-paper px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mascot pose="wave" size={40} />
          <div>
            <div className="font-display font-semibold">Let&apos;s set up Scoop</div>
            <div className="text-xs text-muted">Chat with Rocky, or <Link href="/onboarding/form" className="text-merle">fill in a form instead</Link>.</div>
          </div>
        </div>
      </header>
      <OnboardingChat initial={state} self={{ name: user.name, email: user.email }} />
    </main>
  );
}
