import { Icon } from "@/components/icons";

/**
 * Hero visual: the pipeline. A live transcript on the left, structured output on
 * the right, with data visibly flowing between them. Dark, precise, engineered.
 */
const TRANSCRIPT = [
  { t: "00:41", who: "Priya", text: "Dana, can you own the pricing table for the proposal?", hit: true },
  { t: "00:55", who: "Dana", text: "On it. Marcus needs it Wednesday so it goes out Thursday.", hit: true },
  { t: "01:10", who: "Priya", text: "Jordan, can you stand up the demo environment in two weeks?", hit: true },
  { t: "01:35", who: "Jordan", text: "Yes. I'll need their brand assets first.", hit: false },
  { t: "01:50", who: "Priya", text: "And we're moving kickoff to the 24th.", hit: true },
];

const OUTPUT = [
  { kind: "Task", title: "Send pricing table to Marcus", meta: [["Owner", "Dana K."], ["Role", "Finance"], ["Due", "Wed"]], src: "00:41" },
  { kind: "Task", title: "Stand up Acme demo environment", meta: [["Owner", "Jordan M."], ["Role", "Engineering"], ["Due", "Sep 26"]], src: "01:10" },
  { kind: "Decision", title: "Kickoff moved to the 24th", meta: [["Posted", "#client-acme"]], src: "01:50" },
];

export default function HeroScene() {
  return (
    <div className="relative rounded-3xl bg-[#0e1220] text-paper shadow-lift overflow-hidden ring-1 ring-white/10">
      {/* grid texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-merle/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-copper/20 blur-3xl" />

      {/* header */}
      <div className="relative flex items-center justify-between px-5 py-3 border-b border-white/10 text-[11px] font-mono text-paper/60">
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-clay animate-pulse" />REC · Acme weekly sync · 12:04</span>
        <span className="flex items-center gap-2"><Icon name="mic" size={12} />Rocky listening</span>
      </div>

      <div className="relative grid grid-cols-[1fr_28px_1fr] sm:grid-cols-[1.1fr_40px_1fr] gap-0 px-5 py-5">
        {/* transcript */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-paper/40 mb-3">Transcript</div>
          <ul className="space-y-2.5">
            {TRANSCRIPT.map((l, i) => (
              <li key={l.t} className="hero-in text-[12.5px] leading-snug" style={{ animationDelay: `${i * 220}ms` }}>
                <span className="font-mono text-paper/35 mr-2">{l.t}</span>
                <span className="text-paper/60 mr-1.5">{l.who}</span>
                <span className={l.hit ? "text-paper bg-merle/40 rounded px-1 -mx-1 box-decoration-clone" : "text-paper/70"}>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* flow */}
        <div className="relative">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 40 260" preserveAspectRatio="none" aria-hidden>
            {[40, 100, 165].map((y, i) => (
              <path key={y} d={`M0 ${y} C 20 ${y}, 20 ${60 + i * 70}, 40 ${60 + i * 70}`} fill="none" stroke="url(#flow)" strokeWidth="1.5" strokeDasharray="4 6" className="hero-flow" style={{ animationDelay: `${i * 300}ms` }} />
            ))}
            <defs>
              <linearGradient id="flow" x1="0" x2="1"><stop offset="0" stopColor="#3b5b85" /><stop offset="1" stopColor="#e19a46" /></linearGradient>
            </defs>
          </svg>
        </div>

        {/* structured output */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-paper/40 mb-3">Structured · routed by role</div>
          <ul className="space-y-2.5">
            {OUTPUT.map((o, i) => (
              <li key={o.title} className="hero-in rounded-xl bg-white/[0.06] ring-1 ring-white/10 p-3" style={{ animationDelay: `${600 + i * 260}ms` }}>
                <div className="flex items-center justify-between text-[10px] font-mono text-paper/45">
                  <span className={`rounded px-1.5 py-0.5 ${o.kind === "Task" ? "bg-copper/25 text-copper" : "bg-merle/40 text-sky"}`}>{o.kind.toUpperCase()}</span>
                  <span>from {o.src}</span>
                </div>
                <div className="text-[13px] font-semibold mt-1.5 leading-snug">{o.title}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-paper/60">
                  {o.meta.map(([k, v]) => <span key={k}><span className="text-paper/35">{k} </span><span className="text-paper/85">{v}</span></span>)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* footer */}
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 border-t border-white/10 text-[11px] font-mono text-paper/55">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-grass" />2 tasks assigned</span>
        <span>1 decision</span>
        <span>summary → Slack, email</span>
        <span className="ml-auto text-paper/35">latency 41s</span>
      </div>
    </div>
  );
}
