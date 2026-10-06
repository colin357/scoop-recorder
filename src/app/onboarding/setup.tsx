"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { completeOnboarding, suggestStarterProjectsAction } from "@/app/actions/onboarding";
import { Mascot, type MascotPose } from "@/components/mascot";
import { Icon } from "@/components/icons";
import { Confetti, PawBurst } from "@/components/celebrate";

/**
 * Onboarding: six short pages, one or two questions each. Progress is kept
 * in this browser so a refresh doesn't lose anything.
 */
type Teammate = { name: string; email: string; role: string; responsibilities: string };
type Project = { name: string; description: string; picked: boolean };
type Answers = {
  orgName: string;
  industry: string | null;
  description: string;
  role: string;
  handles: string;
  size: "solo" | "small" | "mid" | "large" | null;
  teammates: Teammate[];
  projects: Project[];
  review: boolean | null;
};

const STORE = "scoop.onboarding.v2";
const blankMate = (): Teammate => ({ name: "", email: "", role: "", responsibilities: "" });
const START: Answers = { orgName: "", industry: null, description: "", role: "", handles: "", size: null, teammates: [], projects: [], review: null };

const INDUSTRIES: { key: string; label: string; emoji: string; starters: [string, string][] }[] = [
  { key: "agency", label: "Agency", emoji: "🎨", starters: [["Client work", "Projects for clients"], ["New business", "Pitches and proposals"], ["Internal ops", "Hiring, tools, finance"]] },
  { key: "realestate", label: "Real estate", emoji: "🏡", starters: [["Listings", "Sellers and listing prep"], ["Buyers", "Showings and offers"], ["Closings", "Contracts and deadlines"]] },
  { key: "consulting", label: "Consulting", emoji: "📊", starters: [["Client engagements", "Active client work"], ["Proposals", "New business"], ["Internal ops", "Hiring, tools, finance"]] },
  { key: "software", label: "Software", emoji: "💻", starters: [["Product", "Roadmap and releases"], ["Customers", "Onboarding and support"], ["Hiring", "Open roles"]] },
  { key: "services", label: "Local services", emoji: "🛠️", starters: [["Jobs", "Booked work"], ["Quotes", "Estimates and follow-ups"], ["Operations", "Scheduling and suppliers"]] },
  { key: "other", label: "Something else", emoji: "✨", starters: [["Clients", "Client work"], ["Internal ops", "Admin and planning"]] },
];

const SIZES: { key: NonNullable<Answers["size"]>; label: string; sub: string; rows: number }[] = [
  { key: "solo", label: "Just me", sub: "for now", rows: 0 },
  { key: "small", label: "2–5", sub: "people", rows: 2 },
  { key: "mid", label: "6–15", sub: "people", rows: 3 },
  { key: "large", label: "16+", sub: "people", rows: 3 },
];

const STEPS: { pose: MascotPose }[] = [{ pose: "wave" }, { pose: "listen" }, { pose: "write" }, { pose: "think" }, { pose: "think" }, { pose: "celebrate" }];

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function OnboardingSetup({ self }: { self: { name: string; email: string } }) {
  const first = self.name.split(" ")[0] || "there";
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(START);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [suggesting, setSuggesting] = useState(false);
  // Little celebrations between some pages: a burst on screen and a cheer from Rocky.
  const [burst, setBurst] = useState<{ kind: "confetti" | "paws"; key: number; pieces?: number } | null>(null);
  const [cheer, setCheer] = useState<{ step: number; text: string } | null>(null);
  const celebrate = (kind: "confetti" | "paws", forStep: number, text: string, pieces?: number) => {
    const key = Date.now();
    setBurst({ kind, key, pieces });
    setCheer({ step: forStep, text });
    setTimeout(() => setBurst((b) => (b?.key === key ? null : b)), 3200);
  };
  const loaded = useRef(false);
  const suggestedFor = useRef<string | null>(null);

  // Restore progress after hydration, then save on every change.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as { step: number; a: Answers } | null;
        if (saved?.a) { setA({ ...START, ...saved.a }); setStep(Math.min(saved.step ?? 0, STEPS.length - 1)); }
      } catch {}
      loaded.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(STORE, JSON.stringify({ step, a })); } catch {}
  }, [step, a]);

  const set = (patch: Partial<Answers>) => setA((x) => ({ ...x, ...patch }));
  const industry = INDUSTRIES.find((i) => i.key === a.industry) ?? null;

  // Project ideas: starters for the industry right away, then Rocky's suggestions from the description.
  const loadIdeas = () => {
    const key = `${a.industry}|${a.description.trim()}`;
    if (suggestedFor.current === key) return;
    suggestedFor.current = key;
    const starters = (industry?.starters ?? INDUSTRIES[INDUSTRIES.length - 1].starters).map(([name, description]) => ({ name, description, picked: false }));
    setA((x) => (x.projects.some((p) => p.picked) ? x : { ...x, projects: starters }));
    const about = [industry ? `${industry.label} business.` : "", a.description].join(" ").trim();
    if (!about) return;
    setSuggesting(true);
    suggestStarterProjectsAction(about, a.orgName)
      .then((ideas) => {
        if (!ideas.length) return;
        // Rocky's ideas go first, then the starters (and anything already picked).
        setA((x) => {
          const names = new Set(x.projects.map((p) => p.name.toLowerCase()));
          const fresh = ideas.filter((i) => !names.has(i.name.toLowerCase())).map((i) => ({ ...i, picked: false }));
          return { ...x, projects: [...fresh, ...x.projects] };
        });
      })
      .catch(() => {})
      .finally(() => setSuggesting(false));
  };

  const goTo = (n: number) => {
    setError(null);
    if (n === 4) loadIdeas();
    if (n === 1 && step === 0) celebrate("paws", 1, "Love that name! 🐶");
    if (n === 4 && step === 3) celebrate("confetti", 4, namedMates.length ? `What a crew! ${namedMates.length + 1} of you 🎉` : "Solo and mighty! 💪");
    setStep(n);
  };

  const namedMates = a.teammates.filter((m) => m.name.trim());
  const missingEmail = namedMates.find((m) => !emailOk(m.email));
  const pickedProjects = a.projects.filter((p) => p.picked && p.name.trim());

  const canNext = [
    a.orgName.trim().length > 0,
    Boolean(a.industry) || a.description.trim().length > 0,
    a.role.trim().length > 0,
    a.size !== null, // a missing email is explained when they press Continue
    true,
    a.review !== null,
  ][step];

  const next = () => {
    setError(null);
    if (step === 3 && missingEmail) { setError(`Add an email for ${missingEmail.name.trim()} so we can invite them.`); return; }
    if (!canNext) return;
    if (step < STEPS.length - 1) { goTo(step + 1); return; }
    // The big finish: confetti, then set everything up while it falls.
    celebrate("confetti", step, "Let's do this! 🎉", 160);
    let reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
    start(async () => {
      if (!reduced) await new Promise((r) => setTimeout(r, 1100));
      try {
        const description = [industry && industry.key !== "other" ? `${industry.label}.` : "", a.description.trim()].join(" ").trim();
        try { localStorage.removeItem(STORE); } catch {}
        await completeOnboarding({
          orgName: a.orgName,
          businessDescription: description || null,
          reviewBeforeAssign: Boolean(a.review),
          members: [
            { name: self.name, email: self.email, role: a.role.trim(), responsibilities: a.handles.trim() },
            ...namedMates.map((m) => ({ name: m.name.trim(), email: m.email.trim(), role: m.role.trim() || "Team member", responsibilities: m.responsibilities.trim() })),
          ],
          projects: pickedProjects.map((p) => ({ name: p.name.trim(), description: p.description })),
        });
      } catch (e) {
        // completeOnboarding redirects on success; anything else is a real error.
        if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    });
  };

  const pickSize = (key: NonNullable<Answers["size"]>) => {
    const rows = SIZES.find((s) => s.key === key)!.rows;
    const kept = a.teammates.filter((m) => m.name.trim() || m.email.trim());
    set({ size: key, teammates: key === "solo" ? kept : [...kept, ...Array.from({ length: Math.max(0, rows - kept.length) }, blankMate)] });
  };
  const updateMate = (i: number, patch: Partial<Teammate>) => {
    setError(null);
    set({ teammates: a.teammates.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  };

  const [newProject, setNewProject] = useState("");
  const addProject = () => {
    const name = newProject.trim();
    if (!name) return;
    if (!a.projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) set({ projects: [...a.projects, { name, description: "", picked: true }] });
    else set({ projects: a.projects.map((p) => (p.name.toLowerCase() === name.toLowerCase() ? { ...p, picked: true } : p)) });
    setNewProject("");
  };

  const company = a.orgName.trim() || "your company";

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress */}
      <div className="px-6 pt-5">
        <div className="mx-auto max-w-xl flex items-center gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => { setError(null); setStep(step - 1); }} className="btn-ghost !px-2 text-sm" aria-label="Back"><Icon name="chevron" size={18} className="rotate-90" /></button>
          ) : <span className="w-9" />}
          <div className="flex-1 h-2 rounded-full bg-paper-2 overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
            <div className="h-full rounded-full bg-flame transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted tabular-nums w-9 text-right">{step + 1}/{STEPS.length}</span>
        </div>
      </div>

      <form
        className="flex-1 flex items-start sm:items-center justify-center px-6 py-10"
        onSubmit={(e) => { e.preventDefault(); next(); }}
      >
        <div key={step} className="onboard-step w-full max-w-xl">
          <div className="relative inline-block">
            <span className="rocky-hop"><Mascot pose={STEPS[step].pose} size={step === 0 || step === 5 ? 112 : 84} /></span>
            {cheer?.step === step && (
              <span key={cheer.text} className="cheer absolute left-full top-3 ml-2 whitespace-nowrap rounded-2xl rounded-bl-sm border edge bg-paper px-3 py-1.5 text-sm font-semibold shadow-soft">{cheer.text}</span>
            )}
          </div>

          {step === 0 && (
            <>
              <h1 className="onboard-q">Hi {first}, I&apos;m Rocky! 👋</h1>
              <p className="onboard-sub">I&apos;ll sit in on your meetings and make sure nothing slips. Let&apos;s get you set up. It takes about two minutes.</p>
              <label className="block mt-8 text-sm font-medium" htmlFor="orgName">What&apos;s your company called?</label>
              <input id="orgName" className="onboard-input mt-2" autoFocus autoComplete="organization" placeholder="Bonita Bay Realty" value={a.orgName} onChange={(e) => set({ orgName: e.target.value })} />
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="onboard-q">Nice! What does {company} do?</h1>
              <p className="onboard-sub">Pick what fits, then add a line or two. I use this to file meetings under the right project.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {INDUSTRIES.map((i) => (
                  <button key={i.key} type="button" onClick={() => set({ industry: a.industry === i.key ? null : i.key })} className={`onboard-chip ${a.industry === i.key ? "onboard-chip-on" : ""}`} aria-pressed={a.industry === i.key}>
                    <span aria-hidden>{i.emoji}</span> {i.label}
                  </button>
                ))}
              </div>
              <textarea className="onboard-input mt-4 !text-base min-h-24" rows={3} placeholder="e.g. We help families buy and sell waterfront homes in Naples, FL." value={a.description} onChange={(e) => set({ description: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); next(); } }} />
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="onboard-q">And what&apos;s your role, {first}?</h1>
              <p className="onboard-sub">When something in a meeting sounds like your job, I&apos;ll know it&apos;s yours.</p>
              <label className="block mt-8 text-sm font-medium" htmlFor="role">Your role</label>
              <input id="role" className="onboard-input mt-2" autoFocus placeholder="Founder, Broker, Account Manager…" value={a.role} onChange={(e) => set({ role: e.target.value })} />
              <label className="block mt-5 text-sm font-medium" htmlFor="handles">What do you usually handle? <span className="text-muted font-normal">(optional)</span></label>
              <input id="handles" className="onboard-input mt-2 !text-base" placeholder="Pricing, closing deals, anything with the bank" value={a.handles} onChange={(e) => set({ handles: e.target.value })} />
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="onboard-q">Who&apos;s on the team?</h1>
              <p className="onboard-sub">I hand each follow-up to the right person, so tell me who does what.</p>
              <div className="mt-6 grid grid-cols-4 gap-2">
                {SIZES.map((s) => (
                  <button key={s.key} type="button" onClick={() => pickSize(s.key)} className={`onboard-tile ${a.size === s.key ? "onboard-tile-on" : ""}`} aria-pressed={a.size === s.key}>
                    <span className="font-display font-bold text-lg leading-none">{s.label}</span>
                    <span className="text-[11px] opacity-70 mt-1">{s.sub}</span>
                  </button>
                ))}
              </div>
              {a.size && a.size !== "solo" && (
                <div className="mt-5 space-y-3">
                  {a.teammates.map((m, i) => (
                    <div key={i} className="onboard-mate">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted">Teammate {i + 1}</span>
                        <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => set({ teammates: a.teammates.filter((_, j) => j !== i) })}>Remove</button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        <input placeholder="Name" value={m.name} onChange={(e) => updateMate(i, { name: e.target.value })} aria-label={`Teammate ${i + 1} name`} />
                        <input type="email" placeholder="Email" value={m.email} onChange={(e) => updateMate(i, { email: e.target.value })} aria-label={`Teammate ${i + 1} email`} />
                        <input placeholder="Role" value={m.role} onChange={(e) => updateMate(i, { role: e.target.value })} aria-label={`Teammate ${i + 1} role`} />
                        <input placeholder="Handles… (e.g. showings, contracts)" value={m.responsibilities} onChange={(e) => updateMate(i, { responsibilities: e.target.value })} aria-label={`Teammate ${i + 1} handles`} />
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="btn-secondary text-sm" onClick={() => set({ teammates: [...a.teammates, blankMate()] })}>+ Add someone</button>
                    <span className="text-xs text-muted">We&apos;ll invite them by email. You can add more later.</span>
                  </div>
                </div>
              )}
              {a.size === "solo" && <p className="mt-5 text-sm text-ink-soft">Flying solo, nice. You can invite people any time from the Team page.</p>}
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="onboard-q">What are you working on?</h1>
              <p className="onboard-sub">Tap the ones that fit. I&apos;ll sort meetings and tasks into them. Clients make great projects.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {a.projects.map((p, i) => (
                  <button key={p.name + i} type="button" title={p.description || undefined} onClick={() => set({ projects: a.projects.map((x, j) => (j === i ? { ...x, picked: !x.picked } : x)) })} className={`onboard-chip ${p.picked ? "onboard-chip-on" : ""}`} aria-pressed={p.picked}>
                    {p.picked ? <Icon name="check" size={14} /> : <span aria-hidden className="opacity-60">+</span>} {p.name}
                  </button>
                ))}
                {suggesting && <span className="onboard-chip opacity-60 animate-pulse">🐾 Sniffing out ideas…</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <input className="flex-1" placeholder="Add your own, like a client's name" value={newProject} onChange={(e) => setNewProject(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newProject.trim()) addProject(); else next(); } }} />
                <button type="button" className="btn-secondary" onClick={addProject} disabled={!newProject.trim()}>Add</button>
              </div>
              <p className="mt-3 text-xs text-muted">{pickedProjects.length ? `${pickedProjects.length} picked. ` : ""}You can change these any time.</p>
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="onboard-q">Last one! How should I hand out tasks?</h1>
              <p className="onboard-sub">After each meeting I turn what was said into tasks for {namedMates.length ? "your team" : "you"}.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {[
                  { v: false, emoji: "🚀", title: "Assign them right away", text: "Everyone gets their tasks as soon as the meeting ends." },
                  { v: true, emoji: "👀", title: "Let me review first", text: "Tasks wait as drafts until you approve them." },
                ].map((o) => (
                  <button key={o.title} type="button" onClick={() => set({ review: o.v })} className={`onboard-choice ${a.review === o.v ? "onboard-choice-on" : ""}`} aria-pressed={a.review === o.v}>
                    <span className="text-2xl" aria-hidden>{o.emoji}</span>
                    <span className="font-semibold mt-2">{o.title}</span>
                    <span className="text-sm opacity-75 mt-1">{o.text}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">You can switch this later in Settings.</p>
            </>
          )}

          {error && <p className="mt-4 text-sm text-clay">{error}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button className="btn-primary !px-6 !py-3 text-base" disabled={!canNext || pending}>
              {pending ? "Setting things up…" : step === 0 ? "Nice to meet you →" : step === STEPS.length - 1 ? "Let's go! 🎉" : "Continue →"}
            </button>
            {step === 3 && a.size && a.size !== "solo" && !namedMates.length && (
              <button type="button" className="btn-ghost text-sm" onClick={() => { set({ teammates: [] }); goTo(4); }}>I&apos;ll add them later</button>
            )}
            {step === 4 && !pickedProjects.length && <button type="button" className="btn-ghost text-sm" onClick={() => goTo(5)}>Skip for now</button>}
            <span className="hidden sm:inline text-xs text-muted">or press Enter ↵</span>
          </div>
        </div>
      </form>
      {burst?.kind === "confetti" && <Confetti burstKey={burst.key} pieces={burst.pieces} />}
      {burst?.kind === "paws" && <PawBurst burstKey={burst.key} />}
    </div>
  );
}
