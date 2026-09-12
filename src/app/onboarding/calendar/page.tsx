import { signOutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { requireOrg, calendarRequired } from "@/lib/auth";
import { calendarProviderConfigured } from "@/lib/calendar";
import { Mascot } from "@/components/mascot";
import { Icon } from "@/components/icons";

export default async function OnboardingCalendarPage({ searchParams }: PageProps<"/onboarding/calendar">) {
  const sp = await searchParams;
  const { membership, org } = await requireOrg({ skipCalendarGate: true });
  if (!(await calendarRequired(membership.id))) redirect("/dashboard");
  const google = calendarProviderConfigured("google");
  const microsoft = calendarProviderConfigured("microsoft");

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <section className="hero relative overflow-hidden rounded-2xl border-2 border-ink shadow-[4px_4px_0_0_#171b26] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
          <Mascot pose="listen" size={120} className="relative shrink-0" />
          <div className="relative">
            <div className="eyebrow">Last step</div>
            <h1 className="text-2xl font-bold tracking-tight">Connect your calendar</h1>
            <p className="text-ink-soft text-sm mt-1">
              This is how Rocky knows when your meetings are. He&apos;ll spot the ones with a Google Meet, Zoom or Teams link and ask before joining to record.
            </p>
          </div>
        </section>

        {typeof sp.error === "string" && (
          <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3 mb-4">
            Connection failed: {decodeURIComponent(sp.error)}. Please try again.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <a href="/api/calendar/google/start" className={`card p-5 flex items-center gap-4 hover:border-merle hover:-translate-y-0.5 transition ${google ? "" : "opacity-50 pointer-events-none"}`}>
            <span className="h-11 w-11 rounded-xl border-2 border-ink bg-sky flex items-center justify-center text-merle"><Icon name="calendar" size={22} /></span>
            <span>
              <span className="block font-semibold">Google Calendar</span>
              <span className="block text-xs text-muted">Google Workspace or Gmail</span>
            </span>
          </a>
          <a href="/api/calendar/microsoft/start" className={`card p-5 flex items-center gap-4 hover:border-merle hover:-translate-y-0.5 transition ${microsoft ? "" : "opacity-50 pointer-events-none"}`}>
            <span className="h-11 w-11 rounded-xl border-2 border-ink bg-butter flex items-center justify-center text-ink"><Icon name="mail" size={22} /></span>
            <span>
              <span className="block font-semibold">Outlook / Microsoft 365</span>
              <span className="block text-xs text-muted">Work, school or personal account</span>
            </span>
          </a>
        </div>

        <ul className="text-sm text-muted mt-6 space-y-1">
          <li>• Read-only access. Rocky never edits or creates events.</li>
          <li>• You choose per meeting whether to record, or switch to fully automatic later.</li>
          <li>• Each teammate at {org.name} connects their own calendar when they sign in.</li>
        </ul>
        <form action={signOutAction} className="text-xs text-muted mt-6">
          Signed in as {membership.email}. <button className="underline">Not you? Sign out</button>
        </form>
      </div>
    </main>
  );
}
