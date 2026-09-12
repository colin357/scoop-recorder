import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Mascot } from "@/components/mascot";
import { Icon, type IconName } from "@/components/icons";
import UseCaseChips from "@/components/landing/use-case-chips";
import { AskVignette, CtaLinks, MeetingMockup, PromptVignette, ReviewVignette, SlackVignette } from "@/components/landing/mockups";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(user.memberships.length ? "/dashboard" : "/onboarding");

  const how: { icon: IconName; title: string; text: string }[] = [
    { icon: "users", title: "Learns how your team works", text: "Tell Rocky once who is on the team and what each person handles. From then on he knows that pricing questions go to Dana and client emails go to Marcus." },
    { icon: "spark", title: "Assigns the work automatically", text: "Every commitment in a call becomes a task with the right owner, a due date and a step-by-step plan. No follow-up message needed. No “who was handling that?”" },
    { icon: "chat", title: "Shares the context, not just the task", text: "Each person gets what they need to act: the summary, the quote, the exact moment in the recording, and a way to ask Rocky what was said." },
  ];
  const tools = ["Google Meet", "Zoom", "Microsoft Teams", "Google Calendar", "Outlook", "Slack", "Teams chat", "Email"];

  return (
    <main className="flex-1 bg-[#f7f6f3] text-ink">
      <header className="sticky top-0 z-30 bg-[#f7f6f3]/85 backdrop-blur border-b edge">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><Mascot pose="listen" size={40} className="!animate-none" /><span className="font-display font-bold text-xl tracking-tight">scoop</span></Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-soft">
            <a href="#how" className="hover:text-ink">How it works</a><a href="#team" className="hover:text-ink">For teams</a><a href="#trust" className="hover:text-ink">Trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold text-ink-soft hover:text-ink px-3 py-2">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center rounded-full bg-ink text-paper text-sm font-semibold px-4 py-2 hover:bg-merle-deep transition" style={{ fontFamily: "var(--font-display)" }}>Start free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div>
          <h1 className="font-display font-bold tracking-[-0.03em] leading-[1.02] text-[40px] sm:text-[52px] lg:text-[64px] [text-wrap:balance]">The meeting ends.<br />The work is already assigned.</h1>
          <p className="text-lg md:text-xl text-ink-soft mt-6 max-w-xl leading-relaxed">Rocky learns how your team works: who owns what, and what each person handles. After every call he assigns the action items to the right people, with the context they need, so nothing gets lost between meetings and messages.</p>
          <div className="mt-7"><CtaLinks big /></div>
          <div className="mt-8"><UseCaseChips /></div>
        </div>
        <div className="relative">
          <div className="rounded-[28px] overflow-hidden aspect-[4/5] sm:aspect-square lg:aspect-[4/5] flex items-end justify-center" style={{ background: "radial-gradient(120% 90% at 20% 10%, #dce7f5 0%, #3b5b85 35%, #f27daa 70%, #f6d27a 100%)" }}>
            <Mascot pose="wave" size={520} className="!animate-none w-[92%] h-auto drop-shadow-[0_24px_40px_rgba(23,27,38,0.35)] translate-y-6" />
          </div>
          <div className="absolute -left-4 bottom-8 hidden md:block"><PromptVignette /></div>
        </div>
      </section>

      {/* Product mockup */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <MeetingMockup />
        <p className="text-center text-xs text-muted mt-4">A real meeting page: summary, decisions, and every task with its owner, due date and the moment it came from.</p>
      </section>

      {/* How teams use */}
      <section id="how" className="border-t edge bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="eyebrow">How teams use Scoop</div>
          <h2 className="font-display font-bold tracking-[-0.02em] text-3xl md:text-5xl mt-2 max-w-2xl">Fewer communication breakdowns. Zero extra messages.</h2>
          <div className="grid md:grid-cols-3 gap-10 mt-12">
            {how.map((h) => (
              <div key={h.title}>
                <span className="h-11 w-11 rounded-xl bg-sky text-merle flex items-center justify-center"><Icon name={h.icon} size={22} /></span>
                <h3 className="font-semibold text-lg mt-4">{h.title}</h3>
                <p className="text-ink-soft mt-2 leading-relaxed">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display font-bold tracking-[-0.02em] text-3xl md:text-4xl">Connected to where you already work.</h2>
        <p className="text-ink-soft mt-3 max-w-2xl mx-auto">Records on the three big platforms, reads your calendar, and delivers to the places your team actually looks.</p>
        <div className="flex flex-wrap justify-center gap-2.5 mt-8">
          {tools.map((t) => <span key={t} className="rounded-full border edge bg-paper px-4 py-2 text-sm font-medium text-ink-soft">{t}</span>)}
        </div>
      </section>

      {/* Team vignettes */}
      <section id="team" className="border-t edge bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="eyebrow">For teams</div>
          <h2 className="font-display font-bold tracking-[-0.02em] text-3xl md:text-5xl mt-2 max-w-2xl">A notetaker for the whole team.</h2>
          <p className="text-ink-soft mt-4 max-w-2xl text-lg">The people who were in the meeting and the people who weren&apos;t end up on the same page. Summaries land in Slack or Teams, assignees get their tasks with the context attached, and anyone can ask Rocky what was actually said.</p>
          <div className="grid md:grid-cols-2 gap-6 mt-12 items-start">
            <SlackVignette />
            <AskVignette />
            <ReviewVignette />
            <div className="rounded-2xl bg-paper-2 p-6 flex items-center gap-5">
              <Mascot pose="celebrate" size={96} className="shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Always accurate, never guessing.</h3>
                <p className="text-ink-soft mt-1">Every task points at the quote and the timestamp it came from. If it wasn&apos;t said, it doesn&apos;t become a task. If it was said and nobody owned it, it&apos;s flagged, not invented.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 items-start">
          <div>
            <div className="eyebrow">Trust</div>
            <h2 className="font-display font-bold tracking-[-0.02em] text-3xl md:text-4xl mt-2">Built for consent.</h2>
            <p className="text-ink-soft mt-3">Recording calls is a responsibility. Scoop makes the defaults safe and the controls obvious.</p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-6 text-sm">
            {[
              ["Announces itself", "Rocky tells the room it's recording when it joins, with a way to opt out."],
              ["Read-only calendar", "Calendar access is read-only. Nothing is created or edited."],
              ["Retention limits", "Purge recordings and transcripts after N days. Keep the summaries."],
              ["Audit log and export", "Every change is logged. Your data exports in one click."],
              ["Review mode", "Hold AI tasks as drafts until an admin approves them."],
              ["Admin roles", "Only admins change recording policy, the team, or settings."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3"><span className="mt-0.5 h-6 w-6 rounded-full bg-grass-soft text-grass flex items-center justify-center shrink-0"><Icon name="check" size={14} /></span><div><div className="font-semibold">{t}</div><div className="text-ink-soft mt-0.5">{d}</div></div></li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t edge bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <Mascot pose="wave" size={120} className="mx-auto" />
          <h2 className="font-display font-bold tracking-[-0.02em] text-3xl md:text-5xl mt-4">Free while we&apos;re in beta.</h2>
          <p className="text-ink-soft mt-3 text-lg">Unlimited meetings for early teams. Early teams keep a discount when pricing arrives.</p>
          <div className="flex justify-center mt-8"><CtaLinks big /></div>
        </div>
      </section>

      <footer className="border-t edge">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span>© {new Date().getFullYear()} Scoop · scooprecorder.com</span>
          <span className="flex gap-5"><a href="#trust" className="hover:text-ink">Trust</a><Link href="/login" className="hover:text-ink">Sign in</Link><Link href="/signup" className="hover:text-ink">Start free</Link></span>
        </div>
      </footer>
    </main>
  );
}
