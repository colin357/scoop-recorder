import { signOutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { requireOrg, calendarRequired } from "@/lib/auth";
import { calendarProviderConfigured } from "@/lib/calendar";
import { Mascot, Blobs } from "@/components/mascot";

export default async function OnboardingCalendarPage({ searchParams }: PageProps<"/onboarding/calendar">) {
  const sp = await searchParams;
  const { membership, org } = await requireOrg({ skipCalendarGate: true });
  if (!(await calendarRequired(membership.id))) redirect("/dashboard");
  const google = calendarProviderConfigured("google");
  const microsoft = calendarProviderConfigured("microsoft");

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <section className="hero relative overflow-hidden rounded-2xl border border-indigo-100 p-6 flex items-center gap-5 mb-6">
          <Blobs />
          <Mascot pose="listen" size={120} className="relative shrink-0" />
          <div className="relative">
            <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Last step</div>
            <h1 className="text-2xl font-semibold tracking-tight">Connect your calendar</h1>
            <p className="text-slate-600 text-sm mt-1">
              This is how Rocky knows when your meetings are. He&apos;ll spot the ones with a Google Meet, Zoom or Teams link and ask before joining to record.
            </p>
          </div>
        </section>

        {typeof sp.error === "string" && (
          <p className="rounded-md bg-red-50 border border-red-200 text-red-800 text-sm p-3 mb-4">
            Connection failed: {decodeURIComponent(sp.error)}. Please try again.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <a href="/api/calendar/google/start" className={`card p-5 flex items-center gap-4 hover:border-indigo-300 hover:-translate-y-0.5 transition ${google ? "" : "opacity-50 pointer-events-none"}`}>
            <span className="text-3xl" aria-hidden>📅</span>
            <span>
              <span className="block font-semibold">Google Calendar</span>
              <span className="block text-xs text-slate-500">Google Workspace or Gmail</span>
            </span>
          </a>
          <a href="/api/calendar/microsoft/start" className={`card p-5 flex items-center gap-4 hover:border-indigo-300 hover:-translate-y-0.5 transition ${microsoft ? "" : "opacity-50 pointer-events-none"}`}>
            <span className="text-3xl" aria-hidden>📆</span>
            <span>
              <span className="block font-semibold">Outlook / Microsoft 365</span>
              <span className="block text-xs text-slate-500">Work, school or personal account</span>
            </span>
          </a>
        </div>

        <ul className="text-sm text-slate-500 mt-6 space-y-1">
          <li>• Read-only access. Rocky never edits or creates events.</li>
          <li>• You choose per meeting whether to record, or switch to fully automatic later.</li>
          <li>• Each teammate at {org.name} connects their own calendar when they sign in.</li>
        </ul>
        <form action={signOutAction} className="text-xs text-slate-400 mt-6">
          Signed in as {membership.email}. <button className="underline">Not you? Sign out</button>
        </form>
      </div>
    </main>
  );
}
