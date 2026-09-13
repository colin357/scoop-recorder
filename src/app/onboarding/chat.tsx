"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { finishFromDraftAction, onboardingChatAction, patchOnboardingDraftAction, resetOnboardingAction, type ChatState } from "@/app/actions/onboarding";
import type { OnboardingDraftData } from "@/lib/onboarding-ai";
import { Mascot } from "@/components/mascot";

type Member = OnboardingDraftData["members"][number];

export default function OnboardingChat({ initial, self }: { initial: ChatState; self: { name: string; email: string } }) {
  const [state, setState] = useState<ChatState>(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [review, setReview] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const run = (fn: () => Promise<ChatState | void>) =>
    start(async () => {
      setError(null);
      try {
        const next = await fn();
        if (next) setState(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });


  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [state.messages.length, pending]);

  // Show the user's bubble right away; the server's reply replaces the whole
  // state (it includes the same message), and a failure takes it back out.
  const send = (text: string, patch?: Partial<OnboardingDraftData>) => {
    if (!text.trim()) return;
    setInput("");
    setState((s) => ({ ...s, messages: [...s.messages, { role: "user", content: text }] }));
    run(async () => {
      try {
        return await onboardingChatAction(text, patch);
      } catch (e) {
        setState((s) => ({ ...s, messages: s.messages.filter((m, i) => !(i === s.messages.length - 1 && m.role === "user" && m.content === text)) }));
        if (!patch) setInput(text);
        throw e;
      }
    });
  };

  // Kick off the conversation.
  useEffect(() => {
    if (state.messages.length === 0 && !started.current) {
      started.current = true;
      send(`Hi! I'm ${self.name}. Let's get set up.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = state.messages[state.messages.length - 1];
  const widget = last?.role === "assistant" ? last.widget : undefined;
  const d = state.draft;
  const named = d.members.filter((m) => m.name.trim());
  const ready = Boolean(d.orgName && d.businessDescription && named.length && d.projects.some((p) => p.confirmed));

  return (
    <div className="flex-1 grid lg:grid-cols-[1fr_320px] min-h-0">
      <div className="flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {state.messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <Mascot pose={i === state.messages.length - 1 && pending ? "think" : "wave"} size={36} className="shrink-0 mt-1" />}
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line border edge ${m.role === "user" ? "bg-merle text-paper rounded-br-sm " : "bg-paper rounded-bl-sm "}`}>{m.content}</div>
            </div>
          ))}
          {pending && (
            <div className="flex gap-3">
              <Mascot pose="think" size={36} className="shrink-0" />
              <div className="rounded-2xl bg-paper border edge px-4 py-3 text-sm text-muted">
                <span className="inline-flex gap-1"><i className="dot" /><i className="dot" /><i className="dot" /></span>
              </div>
            </div>
          )}
          {!pending && widget === "team" && <TeamWidget existing={d.members} teamSize={d.teamSize ?? null} self={self} onSubmit={(members) => send(`Here is my team: ${members.map((m) => `${m.name} (${m.role})`).join(", ")}.`, { members, teamSize: Math.max(members.length, d.teamSize ?? 0) || null })} />}
          {!pending && widget === "projects" && (
            <ProjectsWidget
              projects={d.projects}
              onChange={(projects) => run(() => patchOnboardingDraftAction({ projects }))}
              onConfirm={(projects) => send(`Confirmed projects: ${projects.filter((p) => p.confirmed).map((p) => p.name).join(", ")}.`, { projects })}
            />
          )}
          {!pending && (widget === "finish" || ready) && (
            <div className="card p-4 border-grass bg-grass-soft space-y-3">
              <div className="flex items-center gap-4">
                <Mascot pose="celebrate" size={56} />
                <div className="flex-1 text-sm">
                  <div className="font-semibold">Almost there</div>
                  <div className="text-ink-soft">{d.orgName} · {named.length} team member{named.length === 1 ? "" : "s"} · {d.projects.filter((p) => p.confirmed).length} projects</div>
                </div>
                <button className="btn-primary" onClick={() => run(() => finishFromDraftAction(review))}>Next: connect calendar</button>
              </div>
              <label className="flex items-start gap-3 text-sm font-normal rounded-lg border border-grass bg-paper p-3 cursor-pointer">
                <input type="checkbox" className="!w-auto mt-0.5" checked={review} onChange={(e) => setReview(e.target.checked)} />
                <span><span className="font-medium text-ink block">Let me review AI tasks before my team is notified</span><span className="text-muted">Tasks stay as drafts on the meeting page until an admin approves them. You can change this later in Organization settings.</span></span>
              </label>
            </div>
          )}
          {error && <p className="text-sm text-clay">{error}</p>}
          <div ref={bottom} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t edge bg-paper p-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={pending} autoFocus />
          <button className="btn-primary" disabled={pending || !input.trim()}>Send</button>
        </form>
      </div>

      <aside className="hidden lg:block border-l edge bg-paper p-5 overflow-y-auto">
        <h2 className="eyebrow mb-3">What Rocky has so far</h2>
        <Field label="Company" value={d.orgName} />
        <Field label="About the business" value={d.businessDescription} />
        <div className="mt-3">
          <div className="text-xs font-medium text-muted">Team ({named.length}{d.teamSize && d.teamSize > named.length ? ` of ${d.teamSize}` : ""})</div>
          <ul className="text-sm mt-1 space-y-1">
            {named.map((m, i) => <li key={i}><span className="font-medium">{m.name}</span>{m.role ? ` · ${m.role}` : ""}</li>)}
          </ul>
        </div>
        <div className="mt-3">
          <div className="text-xs font-medium text-muted">Projects ({d.projects.filter((p) => p.confirmed).length} confirmed)</div>
          <ul className="text-sm mt-1 space-y-1">
            {d.projects.map((p, i) => <li key={i} className={p.confirmed ? "" : "text-muted"}>{p.confirmed ? "✓ " : "· "}{p.name}</li>)}
          </ul>
        </div>
        <button className="btn-ghost text-xs mt-6" onClick={() => run(async () => { await resetOnboardingAction(); window.location.reload(); })}>Start over</button>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`text-sm mt-0.5 ${value ? "" : "text-muted italic"}`}>{value || "not yet"}</div>
    </div>
  );
}

const blank = (): Member => ({ name: "", email: null, role: "", responsibilities: "" });

/**
 * One row per person. Rocky records the stated team size (including the user)
 * in the draft, so "I have 2 employees" opens with the user's row plus two
 * empty ones. Nameless placeholder rows from the draft count as empties.
 */
function TeamWidget({ existing, teamSize, self, onSubmit }: { existing: Member[]; teamSize: number | null; self: { name: string; email: string }; onSubmit: (m: Member[]) => void }) {
  const [rows, setRows] = useState<Member[]>(() => {
    const named = existing.filter((m) => m.name.trim());
    const seed = named.some((m) => m.email?.toLowerCase() === self.email.toLowerCase()) ? named : [{ name: self.name, email: self.email, role: "", responsibilities: "" }, ...named];
    const target = Math.max(teamSize ?? 0, seed.length + (seed.length < 2 ? 1 : 0));
    return [...seed, ...Array.from({ length: Math.max(0, target - seed.length) }, blank)];
  });
  const update = (i: number, patch: Partial<Member>) => setRows((r) => r.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const isSelf = (m: Member) => m.email?.toLowerCase() === self.email.toLowerCase();
  let n = 0;
  return (
    <div className="card p-4 space-y-3 ml-12">
      <div className="text-sm font-semibold">Your team{teamSize ? ` · ${teamSize} ${teamSize === 1 ? "person" : "people"}` : ""}</div>
      <p className="text-xs text-muted">Roles and “what they handle” are what the AI reads when assigning tasks, so be specific.</p>
      {rows.map((m, i) => (
        <div key={i} className="rounded-lg border border-line p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-muted">{isSelf(m) ? "You" : `Teammate ${++n}`}</span>
            {!isSelf(m) && rows.length > 1 && (
              <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>Remove</button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input placeholder="Name" value={m.name} onChange={(e) => update(i, { name: e.target.value })} />
            <input placeholder="Email" type="email" value={m.email ?? ""} onChange={(e) => update(i, { email: e.target.value || null })} />
            <input placeholder="Role (e.g. Account Manager)" value={m.role} onChange={(e) => update(i, { role: e.target.value })} />
            <input placeholder="What they typically handle" value={m.responsibilities} onChange={(e) => update(i, { responsibilities: e.target.value })} />
          </div>
        </div>
      ))}
      <div className="flex justify-between">
        <button type="button" className="btn-secondary" onClick={() => setRows((r) => [...r, blank()])}>+ Add person</button>
        <button type="button" className="btn-primary" onClick={() => onSubmit(rows.filter((r) => r.name.trim()))}>Save team</button>
      </div>
    </div>
  );
}

type Project = OnboardingDraftData["projects"][number];
function ProjectsWidget({ projects, onChange, onConfirm }: { projects: Project[]; onChange: (p: Project[]) => void; onConfirm: (p: Project[]) => void }) {
  const [rows, setRows] = useState<Project[]>(projects.length ? projects : [{ name: "", description: "", confirmed: true }]);
  const update = (i: number, patch: Partial<Project>) => setRows((r) => r.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="card p-4 space-y-3 ml-12">
      <div className="text-sm font-semibold">Suggested projects</div>
      <p className="text-xs text-muted">Untick anything that isn&apos;t a real project. Rename freely. Meetings and tasks get sorted into these.</p>
      {rows.map((p, i) => (
        <label key={i} className={`flex gap-3 items-start rounded-lg border p-3 cursor-pointer font-normal ${p.confirmed ? "border-merle bg-sky-soft" : "border-line"}`}>
          <input type="checkbox" className="!w-auto mt-1.5" checked={p.confirmed} onChange={(e) => update(i, { confirmed: e.target.checked })} />
          <div className="flex-1 grid gap-1">
            <input value={p.name} onChange={(e) => update(i, { name: e.target.value })} className="font-medium" />
            <input value={p.description} onChange={(e) => update(i, { description: e.target.value })} className="text-xs" placeholder="Description" />
          </div>
        </label>
      ))}
      <div className="flex justify-between">
        <button type="button" className="btn-secondary" onClick={() => setRows((r) => [...r, { name: "", description: "", confirmed: true }])}>+ Add project</button>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => onChange(rows)}>Save</button>
          <button type="button" className="btn-primary" onClick={() => onConfirm(rows.filter((r) => r.name.trim()))}>Confirm projects</button>
        </div>
      </div>
    </div>
  );
}
