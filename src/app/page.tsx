import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Blobs, Mascot } from "@/components/mascot";
import { Icon, type IconName } from "@/components/icons";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(user.memberships.length ? "/dashboard" : "/onboarding");

  const features: { icon: IconName; title: string; text: string }[] = [
    { icon: "video", title: "Records every meeting", text: "Rocky joins your Google Meet, Zoom and Teams calls from your calendar. Ask-first or fully automatic." },
    { icon: "spark", title: "Writes the summary", text: "Key points and decisions, minutes after the call ends. Searchable forever, even after recordings are purged." },
    { icon: "check", title: "Assigns the tasks", text: "Every commitment becomes a task with an owner, a deadline and a step-by-step guide, routed by each person's role." },
    { icon: "play", title: "Keeps the receipts", text: "Each task links to the exact second it was discussed, with the quote. Or ask Rocky what was actually said." },
    { icon: "chat", title: "Meets you in Slack", text: "Summaries and tasks post to Slack or Teams. Assignees get an email with their to-dos." },
    { icon: "shield", title: "Built for consent", text: "Announces itself in the call, read-only calendar access, retention limits, audit log and full data export." },
  ];

  return (
    <main className="flex-1">
      <header className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Mascot pose="listen" size={44} /><span className="font-display font-bold text-xl">scoop</span></div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </nav>
      </header>

      <section className="hero relative overflow-hidden border-y-2 border-ink">
        <Blobs />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <div className="eyebrow mb-3">Meeting recorder · task machine</div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">Meetings in.<br /><span className="text-merle">Assigned tasks</span> out.</h1>
            <p className="text-lg text-ink-soft mt-4 max-w-xl">Scoop records your team&apos;s calls, writes the summary, and turns every action item into a task with an owner, a deadline and a plan. Nobody writes notes. Nothing falls through.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/signup" className="btn-accent !px-5 !py-3 text-base">Start free</Link>
              <Link href="/login" className="btn-secondary !px-5 !py-3 text-base">Sign in</Link>
            </div>
            <p className="text-xs text-muted mt-3">Works with Google Meet, Zoom and Microsoft Teams · Google Calendar and Outlook</p>
          </div>
          <div className="flex justify-center"><Mascot pose="wave" size={300} /></div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card p-6">
            <span className="h-11 w-11 rounded-xl border-2 border-ink bg-butter flex items-center justify-center text-ink"><Icon name={f.icon} size={22} /></span>
            <h3 className="font-semibold text-lg mt-4">{f.title}</h3>
            <p className="text-sm text-ink-soft mt-1">{f.text}</p>
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
            <div key={n}><div className="h-9 w-9 rounded-full border-2 border-ink bg-pink text-ink font-display font-bold flex items-center justify-center shadow-[2px_2px_0_0_#171b26]">{n}</div><h3 className="font-semibold text-lg mt-3">{t}</h3><p className="text-sm text-ink-soft mt-1">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 text-center">
        <Mascot pose="celebrate" size={120} className="mx-auto" />
        <h2 className="text-3xl font-bold mt-4">Free while we&apos;re in beta</h2>
        <p className="text-ink-soft mt-1">Unlimited meetings for early teams. Pricing comes later, and early teams keep a discount.</p>
        <Link href="/signup" className="btn-accent !px-5 !py-3 text-base mt-6 inline-flex">Create your account</Link>
      </section>

      <footer className="border-t-2 border-ink py-6 text-center text-xs text-muted bg-paper">© {new Date().getFullYear()} Scoop · scooprecorder.com</footer>
    </main>
  );
}
