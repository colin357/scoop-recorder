"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { LogoMark } from "@/components/logo";

/**
 * Hero visual: the follow-ups landing with the team. A phone lock screen where
 * Rocky's messages arrive one by one after a meeting, and teammates reply.
 * Loops; shows the finished stack when the viewer prefers reduced motion.
 */
type App = { name: string; tile: string; icon?: IconName; glyph?: string; logo?: boolean };
const SCOOP: App = { name: "Scoop", tile: "bg-white", logo: true };
const SLACK: App = { name: "Slack", tile: "bg-[#4a154b] text-white", glyph: "#" };
const MAIL: App = { name: "Mail", tile: "bg-[#2f7cf6] text-white", icon: "mail" };

type Note = { app: App; where?: string; when: string; title: string; body: string; reply?: { who: string; text: string; color: string } };

// In the order they arrive; the newest shows on top.
const NOTES: Note[] = [
  { app: SCOOP, when: "now", title: "Acme weekly sync · notes are ready", body: "3 tasks assigned. Kickoff moved to the 24th." },
  { app: MAIL, when: "now", title: "Marcus, you have 1 new task", body: "Request brand assets from Acme · due today" },
  {
    app: SLACK,
    where: "#client-acme",
    when: "now",
    title: "Rocky",
    body: "@Dana you've got the pricing table for the Acme proposal. Due Wednesday.",
    reply: { who: "Dana", text: "On it, thanks Rocky 🙌", color: "bg-[#e8743b]" },
  },
  { app: SLACK, where: "Direct message", when: "now", title: "Marcus", body: "Didn't take a single note today 😂 Love this." },
];

// Each step reveals one thing: a notification, or the reply under the Slack one.
const STEPS = NOTES.length + 1;
const REPLY_STEP = 4; // after the third notification lands

function AppTile({ app }: { app: App }) {
  return (
    <span className={`h-9 w-9 shrink-0 rounded-[10px] flex items-center justify-center font-bold text-lg overflow-hidden ${app.tile}`}>
      {app.logo ? <LogoMark size={30} /> : app.icon ? <Icon name={app.icon} size={18} /> : app.glyph}
    </span>
  );
}

export default function TeamNotifications() {
  // Server and first client render agree (one notification); then it plays.
  const [step, setStep] = useState(1);

  useEffect(() => {
    let reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
    if (reduced) {
      const t = setTimeout(() => setStep(STEPS), 0);
      return () => clearTimeout(t);
    }
    let s = 1;
    const id = setInterval(() => {
      s = s >= STEPS + 2 ? 1 : s + 1; // hold the full stack for a couple of beats, then start over
      setStep(Math.min(s, STEPS));
    }, 1700);
    return () => clearInterval(id);
  }, []);

  // Map steps to notifications: the reply takes a step of its own.
  const shown = Math.min(NOTES.length, step >= REPLY_STEP ? step - 1 : step);
  const replyShown = step >= REPLY_STEP;
  const visible = NOTES.slice(0, shown).map((n, i) => ({ ...n, i })).reverse();

  return (
    <div className="relative mx-auto w-full max-w-[380px]" aria-label="Rocky's follow-ups arriving on a teammate's phone after a meeting">
      <div className="pointer-events-none absolute -inset-4 sm:-inset-8 rounded-[64px] bg-gradient-to-br from-copper/25 via-butter-soft to-sky blur-2xl opacity-80" />
      <div className="relative rounded-[52px] bg-[#111] p-3 shadow-lift">
        <div className="relative h-[520px] sm:h-[560px] overflow-hidden rounded-[42px] bg-gradient-to-b from-[#f6d9c4] via-[#f3e7dc] to-[#dfe6f1] flex flex-col">
          {/* status bar + clock */}
          <div className="flex items-center justify-between px-8 pt-4 text-[12px] font-semibold text-ink/80">
            <span>4:02</span>
            <span className="h-6 w-24 rounded-full bg-[#111]" />
            <span className="tracking-tight">5G ▮▮▮</span>
          </div>
          <div className="text-center mt-4 text-ink/70">
            <div className="text-[13px] font-medium">Tuesday, September 23</div>
            <div className="font-display font-bold text-[56px] leading-none tracking-tight text-ink/85">4:02</div>
          </div>

          {/* Older notifications slide down and fade out under the fold, like a real lock screen. */}
          <ul className="mt-5 px-3 space-y-2 flex-1 min-h-0 overflow-hidden pb-6" style={{ maskImage: "linear-gradient(to bottom, #000 78%, transparent 97%)", WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 97%)" }}>
            {visible.map((n) => (
              <li key={n.i} className="notif-in">
                <div className="overflow-hidden">
                  <div className="rounded-[22px] bg-white/80 backdrop-blur-md shadow-[0_8px_24px_-12px_rgba(0,0,0,.25)] ring-1 ring-black/5 p-3 flex gap-3">
                    <AppTile app={n.app} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-ink/50">
                        <span className="uppercase tracking-wide">{n.app.name}{n.where ? ` · ${n.where}` : ""}</span>
                        <span className="ml-auto">{n.when}</span>
                      </div>
                      <div className="text-[13px] font-semibold text-ink leading-snug mt-0.5">{n.title}</div>
                      <div className="text-[13px] text-ink/75 leading-snug">{n.body}</div>
                      {n.reply && replyShown && (
                        <div className="notif-in mt-2">
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2 rounded-xl bg-black/[0.04] px-2 py-1.5">
                              <span className={`h-5 w-5 shrink-0 rounded-md text-[10px] font-bold text-white flex items-center justify-center ${n.reply.color}`}>{n.reply.who[0]}</span>
                              <span className="text-[12px] text-ink/80"><span className="font-semibold text-ink">{n.reply.who}</span> {n.reply.text}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="absolute bottom-2 inset-x-0 flex justify-center"><span className="h-1 w-32 rounded-full bg-ink/70" /></div>
        </div>
      </div>
    </div>
  );
}
