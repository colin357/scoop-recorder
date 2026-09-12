import { Mascot } from "@/components/mascot";
import { Icon } from "@/components/icons";

/** Illustrated person: head + shoulders on a soft tile. Not a real photo. */
function Person({ skin, hair, shirt, bg }: { skin: string; hair: string; shirt: string; bg: string }) {
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden>
      <rect width="160" height="120" fill={bg} />
      <path d="M30 120c0-26 22-40 50-40s50 14 50 40Z" fill={shirt} />
      <circle cx="80" cy="52" r="26" fill={skin} />
      <path d="M54 50c0-18 12-30 26-30s26 12 26 30c-6-8-14-12-26-12s-20 4-26 12Z" fill={hair} />
      <circle cx="70" cy="54" r="2.5" fill="#171b26" /><circle cx="90" cy="54" r="2.5" fill="#171b26" />
      <path d="M72 66q8 6 16 0" stroke="#171b26" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const PEOPLE = [
  { name: "Priya", skin: "#f1c9a5", hair: "#2b1d16", shirt: "#3b5b85", bg: "#e6edf7" },
  { name: "Marcus", skin: "#8d5a3c", hair: "#1a1512", shirt: "#e19a46", bg: "#f7ecdc" },
  { name: "Dana", skin: "#f5d6c0", hair: "#b8752b", shirt: "#3fa66b", bg: "#e6f3ea" },
];

/** The hero visual: a live call, Rocky recording, and a sentence turning into an assigned task. */
export default function HeroScene() {
  return (
    <div className="relative rounded-[28px] p-4 sm:p-6 overflow-hidden" style={{ background: "linear-gradient(135deg, #dce7f5 0%, #eef3fa 45%, #fdf3d6 100%)" }}>
      {/* Call window */}
      <div className="rounded-2xl bg-ink shadow-lift overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-paper/70">
          <span className="flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full bg-clay animate-pulse" />Acme weekly sync · 12:04</span>
          <span className="flex items-center gap-1"><Icon name="users" size={13} />4</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 px-1.5">
          {PEOPLE.map((p) => (
            <div key={p.name} className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Person {...p} />
              <span className="absolute left-2 bottom-2 rounded-md bg-ink/70 text-paper text-[11px] px-1.5 py-0.5">{p.name}</span>
            </div>
          ))}
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[#22344f] flex items-center justify-center">
            <Mascot pose="listen" size={110} className="!animate-none" />
            <span className="absolute left-2 bottom-2 rounded-md bg-ink/70 text-paper text-[11px] px-1.5 py-0.5 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-clay" />Rocky · recording</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="rounded-lg bg-paper/10 px-3 py-2 text-[13px] text-paper/90">
            <span className="text-paper/50 mr-2">Dana</span>“I&apos;ll own the pricing table. Marcus needs it by Wednesday so the proposal goes out Thursday.”
          </div>
        </div>
      </div>

      {/* The task that came out of it */}
      <div className="mt-3 sm:mt-4 rounded-2xl bg-paper border edge shadow-soft p-3.5 sm:p-4 flex items-center gap-3">
        <span className="h-9 w-9 rounded-xl bg-grass-soft text-grass flex items-center justify-center shrink-0"><Icon name="check" size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] eyebrow">Assigned automatically</div>
          <div className="font-semibold text-sm truncate">Send revised pricing table to Marcus</div>
          <div className="text-xs text-muted">Dana K. · due Wednesday · from 0:41 in the recording</div>
        </div>
        <span className="hidden sm:inline-flex h-8 w-8 rounded-full bg-butter text-[11px] font-bold text-ink items-center justify-center">DK</span>
      </div>
    </div>
  );
}
