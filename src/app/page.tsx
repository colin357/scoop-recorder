import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Mascot } from "@/components/mascot";
import { Icon, type IconName } from "@/components/icons";
import HeroScene from "@/components/landing/hero-scene";
import { Logo, LogoMark } from "@/components/logo";
import { AskVignette, CtaLinks, MeetingMockup, PromptVignette, ReviewVignette, SlackVignette } from "@/components/landing/mockups";
import { PLANS, PRICING, annualPerSeatPerMonth, fmtUsd } from "@/lib/billing";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(user.memberships.length ? "/dashboard" : "/onboarding");

  const how: { icon: IconName; title: string; text: string }[] = [
    { icon: "users", title: "Learns how your team works", text: "Tell Rocky once who is on the team and what each person handles. From then on he knows that pricing questions go to Dana and client emails go to Marcus." },
    { icon: "spark", title: "Assigns the work automatically", text: "Every commitment in a call becomes a task with the right owner, a due date and a step-by-step plan. No follow-up message needed. No “who was handling that?”" },
    { icon: "chat", title: "Shares the context, not just the task", text: "Each person gets what they need to act: the summary, the quote, the exact moment in the recording, and a way to ask Rocky what was said." },
  ];
  const tools: { group: string; items: string[] }[] = [
    { group: "Records", items: ["Google Meet", "Zoom", "Microsoft Teams"] },
    { group: "Delivers to", items: ["Slack", "Email", "Scoop"] },
  ];

  return (
    <main className="theme-landing flex-1 bg-[#f7f6f3] text-ink">
      <header className="sticky top-0 z-30 bg-[#f7f6f3]/85 backdrop-blur border-b edge">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={40} />
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-soft">
            <a href="#how" className="hover:text-ink">How it works</a><a href="#team" className="hover:text-ink">For teams</a><a href="#pricing" className="hover:text-ink">Pricing</a><a href="#trust" className="hover:text-ink">Trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold text-ink-soft hover:text-ink px-3 py-2">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center rounded-full bg-ink text-paper text-sm font-semibold px-4 py-2 hover:bg-merle-deep transition" style={{ fontFamily: "var(--font-display)" }}>Start free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-16 md:pb-44 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
        <div>
          <h1 className="font-display font-bold tracking-[-0.03em] leading-[1.02] text-[40px] sm:text-[52px] lg:text-[56px] [text-wrap:balance]">The meeting ends.<br />The work is already assigned.</h1>
          <p className="text-lg md:text-xl text-ink-soft mt-6 max-w-md leading-relaxed">Scoop records the call, understands who does what on your team, and routes every follow-up to the right person with the context to act.</p>
          <div className="mt-8"><CtaLinks big /></div>
        </div>
        <div className="relative lg:pt-6">
          <HeroScene />
          <div className="absolute left-6 -bottom-[7.5rem] hidden md:block"><PromptVignette /></div>
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
        <p className="text-ink-soft mt-3 max-w-2xl mx-auto">Nothing new to adopt. Rocky joins the calls you already have and reports back where your team already looks.</p>
        <div className="grid sm:grid-cols-2 gap-6 mt-10 max-w-2xl mx-auto text-left">
          {tools.map((g) => (
            <div key={g.group} className="rounded-2xl border edge bg-paper p-5">
              <div className="eyebrow">{g.group}</div>
              <ul className="mt-2 space-y-1.5">
                {g.items.map((t) => <li key={t} className="text-sm font-medium text-ink-soft flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-merle" />{t}</li>)}
              </ul>
            </div>
          ))}
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

      {/* Pricing */}
      <section id="pricing" className="border-t edge bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <div className="eyebrow">Pricing</div>
            <h2 className="font-display font-bold tracking-[-0.02em] text-3xl md:text-5xl mt-2">Simple, per seat.</h2>
            <p className="text-ink-soft mt-3 text-lg">Two plans. {PRICING.trialDays}-day free trial on both. Cancel any time.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto items-stretch">
            {PLANS.map((plan) => {
              const featured = plan.key === "team";
              return (
                <div key={plan.key} className={featured ? "rounded-3xl bg-[#0e1220] text-paper p-8 md:p-10 ring-1 ring-white/10 shadow-lift flex flex-col" : "card-flat rounded-3xl p-8 md:p-10 flex flex-col"}>
                  <div className="flex items-center justify-between">
                    <span className={`eyebrow ${featured ? "!text-copper" : ""}`}>{plan.name}</span>
                    {featured && <span className="rounded-full bg-copper/20 text-copper px-2.5 py-0.5 text-[11px] font-semibold">Most popular</span>}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-3">
                    <span className="font-display font-bold text-6xl tracking-tight">{fmtUsd(plan.monthly)}</span>
                    <span className={featured ? "text-paper/60" : "text-muted"}>per seat / month</span>
                  </div>
                  <div className={`mt-1 text-sm ${featured ? "text-paper/60" : "text-muted"}`}>or {fmtUsd(annualPerSeatPerMonth(plan.monthly))} per seat / month billed annually <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${featured ? "bg-grass/20 text-grass-soft" : "bg-grass-soft text-grass"}`}>save 20%</span></div>
                  <p className={`mt-4 text-sm ${featured ? "text-paper/70" : "text-ink-soft"}`}>{plan.blurb}</p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {[
                      `${plan.hoursPerSeat} recording hours per seat per month, pooled across your whole team`,
                      "Unlimited meetings, summaries, tasks and Ask Rocky",
                      "Google Meet, Zoom and Microsoft Teams",
                      "Calendar auto-join, Slack and email delivery",
                      "Review mode, audit log, retention controls and export",
                      `Extra hours $${PRICING.overagePerHour.toFixed(2)} each, invoiced monthly`,
                    ].map((t) => (
                      <li key={t} className="flex gap-3">
                        <span className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${featured ? "bg-copper/25 text-copper" : "bg-grass-soft text-grass"}`}><Icon name="check" size={12} /></span>{t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link href="/signup" className={`inline-flex items-center justify-center rounded-full font-semibold px-6 py-3 transition ${featured ? "bg-copper text-ink hover:bg-copper-deep" : "bg-ink text-paper hover:bg-merle-deep"}`} style={{ fontFamily: "var(--font-display)" }}>Start free trial</Link>
                    <span className={`text-xs ${featured ? "text-paper/50" : "text-muted"}`}>Card required · nothing charged for {PRICING.trialDays} days</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted mt-6">A seat is a teammate who has joined your workspace. Anyone can read summaries and tasks you share with them.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t edge">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <Mascot pose="wave" size={120} className="mx-auto" />
          <h2 className="font-display font-bold tracking-[-0.02em] text-3xl md:text-5xl mt-4">Give your team its afternoon back.</h2>
          <p className="text-ink-soft mt-3 text-lg">Set up in five minutes. Rocky joins your next meeting.</p>
          <div className="flex justify-center mt-8"><CtaLinks big /></div>
        </div>
      </section>

      <footer className="border-t edge">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span className="flex items-center gap-2"><LogoMark size={20} />© {new Date().getFullYear()} Scoop · scooprecorder.com</span>
          <span className="flex gap-5"><a href="#pricing" className="hover:text-ink">Pricing</a><a href="#trust" className="hover:text-ink">Trust</a><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/terms" className="hover:text-ink">Terms</Link><Link href="/login" className="hover:text-ink">Sign in</Link><Link href="/signup" className="hover:text-ink">Start free</Link></span>
        </div>
      </footer>
    </main>
  );
}
