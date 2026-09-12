import Link from "next/link";
import { Mascot } from "@/components/mascot";
import { Icon } from "@/components/icons";

function Window({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border edge bg-paper shadow-lift overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b edge bg-paper-2/60">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-muted font-medium truncate">{title}</span>
      </div>
      {children}
    </div>
  );
}

const TASKS = [
  { t: "Send revised pricing table to Acme", who: "Dana K.", due: "Wed", tone: "bg-butter" },
  { t: "Set up demo environment with Acme branding", who: "Jordan M.", due: "Sep 26", tone: "bg-sky" },
  { t: "Request brand assets from client", who: "Marcus L.", due: "Today", tone: "bg-clay-soft" },
  { t: "Schedule follow-up call after proposal", who: "Marcus L.", due: "Mon", tone: "bg-grass-soft" },
];

/** The big hero mockup: a meeting page with summary and assigned tasks. */
export function MeetingMockup() {
  return (
    <Window title="scooprecorder.com / meetings / Acme kickoff">
      <div className="grid md:grid-cols-[1.25fr_1fr]">
        <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r edge">
          <div className="flex items-center gap-2 text-xs text-muted"><span className="badge bg-grass text-paper">Done</span>Google Meet · 32 min · Acme</div>
          <h3 className="text-xl font-bold mt-2">Acme kickoff</h3>
          <p className="text-sm text-ink-soft mt-3 leading-relaxed">Acme wants the proposal by Thursday with updated pricing. They asked for a branded demo environment within two weeks. Kickoff moved to the 24th; Marcus will send the updated invite.</p>
          <div className="mt-4">
            <div className="eyebrow mb-1.5">Decisions</div>
            <ul className="text-sm text-ink-soft space-y-1 list-disc pl-5"><li>Kickoff moves to the 24th</li><li>Discount justified with last quarter&apos;s numbers</li></ul>
          </div>
          <div className="mt-4 rounded-xl bg-paper-2 p-3 text-xs text-muted flex items-center gap-2"><Icon name="play" size={14} className="text-merle" /><span className="text-ink font-medium">0:41</span>“Dana, can you own the pricing table?”</div>
        </div>
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between"><div className="font-semibold text-sm">Tasks from this meeting</div><span className="text-xs text-muted">4</span></div>
          <ul className="mt-3 space-y-2">
            {TASKS.map((x) => (
              <li key={x.t} className="rounded-xl border edge p-3">
                <div className="text-sm font-medium leading-snug">{x.t}</div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted"><span className="h-5 w-5 rounded-full bg-butter text-[9px] font-bold text-ink flex items-center justify-center">{x.who.split(" ").map((s) => s[0]).join("")}</span>{x.who}<span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${x.tone} text-ink`}>{x.due}</span></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Window>
  );
}

/** Small vignette: Slack post. */
export function SlackVignette() {
  return (
    <Window title="#client-acme — Slack">
      <div className="p-4 text-sm">
        <div className="flex items-start gap-3">
          <Mascot pose="listen" size={36} className="shrink-0 !animate-none" />
          <div>
            <div className="font-semibold">Rocky <span className="ml-1 rounded bg-paper-2 px-1 text-[10px] font-medium text-muted">APP</span> <span className="text-xs text-muted font-normal">2:41 PM</span></div>
            <p className="text-ink-soft mt-1"><b>Acme kickoff</b> — summary ready. Proposal due Thursday, demo env in two weeks, kickoff moved to the 24th.</p>
            <p className="text-ink-soft mt-2"><b>Tasks (4)</b><br />• Send revised pricing table — <span className="text-merle">@dana</span>, due Wed<br />• Set up demo environment — <span className="text-merle">@jordan</span>, due Sep 26<br />• Request brand assets — <span className="text-merle">@marcus</span>, due today</p>
          </div>
        </div>
      </div>
    </Window>
  );
}

/** Small vignette: Ask AI. */
export function AskVignette() {
  return (
    <Window title="Ask Rocky about this task">
      <div className="p-4 space-y-3 text-sm">
        <div className="ml-10 rounded-2xl rounded-br-sm bg-merle text-paper px-3.5 py-2">What exactly did they say about the discount?</div>
        <div className="flex gap-2">
          <Mascot pose="think" size={32} className="shrink-0 !animate-none" />
          <div className="rounded-2xl rounded-bl-sm bg-paper-2 px-3.5 py-2 text-ink-soft">At <span className="text-merle font-medium">[0:55]</span> Dana said she&apos;d pull last quarter&apos;s numbers to justify the discount. Priya agreed at <span className="text-merle font-medium">[1:02]</span> as long as it stays under 15%.</div>
        </div>
      </div>
    </Window>
  );
}

/** Small vignette: review drafts. */
export function ReviewVignette() {
  return (
    <Window title="Review before your team is notified">
      <div className="p-4 text-sm">
        <div className="flex items-center gap-3"><Mascot pose="write" size={36} className="shrink-0 !animate-none" /><div><div className="font-semibold">3 drafted tasks waiting for your review</div><div className="text-xs text-muted">Nobody has been notified yet.</div></div><span className="ml-auto rounded-full bg-ink text-paper px-3 py-1 text-xs font-semibold">Approve all</span></div>
        <ul className="mt-3 divide-y edge text-xs">
          {["Send revised pricing table — Dana K.", "Set up demo environment — Jordan M.", "Request brand assets — Marcus L."].map((t) => (
            <li key={t} className="py-2 flex items-center justify-between"><span className="text-ink-soft">{t}</span><span className="flex gap-2 text-[11px]"><span className="text-merle font-semibold">Approve</span><span className="text-muted">Discard</span></span></li>
          ))}
        </ul>
      </div>
    </Window>
  );
}

/** Small vignette: the pop-up before a meeting. */
export function PromptVignette() {
  return (
    <div className="rounded-2xl border edge bg-paper shadow-lift p-4 text-sm max-w-sm">
      <div className="flex gap-3">
        <Mascot pose="wave" size={44} className="shrink-0 !animate-none" />
        <div><div className="eyebrow">Starts in 8 min</div><div className="font-semibold">Acme weekly sync</div><div className="text-xs text-muted">Want me to record this one?</div></div>
      </div>
      <div className="flex gap-2 mt-3"><span className="flex-1 rounded-xl bg-ink text-paper text-center py-1.5 text-xs font-semibold">Record it</span><span className="flex-1 rounded-xl border edge text-center py-1.5 text-xs font-semibold">Skip</span></div>
    </div>
  );
}

export function CtaLinks({ big = false }: { big?: boolean }) {
  const sz = big ? "!px-6 !py-3 text-base" : "";
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/signup" className={`inline-flex items-center justify-center rounded-full bg-ink text-paper font-semibold px-5 py-2.5 hover:bg-merle-deep transition shadow-btn ${sz}`} style={{ fontFamily: "var(--font-display)" }}>Start free</Link>
      <Link href="/login" className={`inline-flex items-center justify-center rounded-full border edge bg-paper text-ink font-semibold px-5 py-2.5 hover:bg-paper-2 transition ${sz}`} style={{ fontFamily: "var(--font-display)" }}>Sign in</Link>
    </div>
  );
}
