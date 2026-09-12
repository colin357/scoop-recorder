import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Blobs, Mascot } from "@/components/mascot";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(user.memberships.length ? "/dashboard" : "/onboarding");

  const features = [
    { icon: "🎥", title: "Records every meeting", text: "Rocky joins your Google Meet, Zoom and Teams calls from your calendar. Ask-first or fully automatic." },
    { icon: "📝", title: "Writes the summary", text: "Key points and decisions, minutes after the call ends. Searchable forever, even after recordings are purged." },
    { icon: "✅", title: "Assigns the tasks", text: "Every commitment becomes a task with an owner, a deadline and a step-by-step guide, routed by each person's role." },
    { icon: "▶️", title: "Keeps the receipts", text: "Each task links to the exact second it was discussed, with the quote. Or ask Rocky what was actually said." },
    { icon: "💬", title: "Meets you in Slack", text: "Summaries and tasks post to Slack or Teams. Assignees get an email with their to-dos." },
    { icon: "🔒", title: "Built for consent", text: "Announces itself in the call, read-only calendar access, retention limits, audit log and full data export." },
  ];

  return (
    <main className="flex-1">
      <header className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Mascot pose="listen" size={40} /><span className="font-semibold text-lg">Scoop</span></div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="hero relative overflow-hidden">
        <Blobs />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">Meetings in.<br />Assigned tasks out.</h1>
            <p className="text-lg text-slate-600 mt-4 max-w-xl">Scoop records your team&apos;s calls, writes the summary, and turns every action item into a task with an owner, a deadline and a plan. Nobody writes notes. Nothing falls through.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/signup" className="btn-primary !px-5 !py-3 text-base">Start free</Link>
              <Link href="/login" className="btn-secondary !px-5 !py-3 text-base">Sign in</Link>
            </div>
            <p className="text-xs text-slate-500 mt-3">Works with Google Meet, Zoom and Microsoft Teams · Google Calendar and Outlook</p>
          </div>
          <div className="flex justify-center"><Mascot pose="wave" size={300} /></div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card p-6">
            <div className="text-3xl" aria-hidden>{f.icon}</div>
            <h3 className="font-semibold mt-3">{f.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="card p-8 grid md:grid-cols-3 gap-8">
          {[
            ["1", "Tell Rocky about your team", "A two-minute chat: what you do, who does what. That's how tasks get routed to the right person."],
            ["2", "Connect your calendar", "Rocky spots meetings with a video link and asks whether to record, or just records if you prefer."],
            ["3", "Get the follow-through", "Summary, decisions, and assigned tasks land in the app, your inbox and Slack before you've refilled your coffee."],
          ].map(([n, t, d]) => (
            <div key={n}><div className="h-8 w-8 rounded-full brand-mark text-white font-semibold flex items-center justify-center">{n}</div><h3 className="font-semibold mt-3">{t}</h3><p className="text-sm text-slate-600 mt-1">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 text-center">
        <Mascot pose="celebrate" size={120} className="mx-auto" />
        <h2 className="text-2xl font-semibold mt-4">Free while we&apos;re in beta</h2>
        <p className="text-slate-600 mt-1">Unlimited meetings for early teams. Pricing comes later, and early teams keep a discount.</p>
        <Link href="/signup" className="btn-primary !px-5 !py-3 text-base mt-6 inline-flex">Create your account</Link>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Scoop · scooprecorder.com</footer>
    </main>
  );
}
