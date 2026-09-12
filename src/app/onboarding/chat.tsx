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

  // Kick off the conversation.
  useEffect(() => {
    if (state.messages.length === 0 && !started.current) {
      started.current = true;
      run(() => onboardingChatAction(`Hi! I'm ${self.name}. Let's get set up.`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [state.messages.length, pending]);

  const send = (text: string, patch?: Partial<OnboardingDraftData>) => {
    if (!text.trim()) return;
    setInput("");
    run(() => onboardingChatAction(text, patch));
  };

  const last = state.messages[state.messages.length - 1];
  const widget = last?.role === "assistant" ? last.widget : undefined;
  const d = state.draft;
  const ready = Boolean(d.orgName && d.businessDescription && d.members.length && d.projects.some((p) => p.confirmed));

  return (
    <div className="flex-1 grid lg:grid-cols-[1fr_320px] min-h-0">
      <div className="flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {state.messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <Mascot pose={i === state.messages.length - 1 && pending ? "think" : "wave"} size={36} className="shrink-0 mt-1" />}
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${m.role === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white border border-slate-200 rounded-bl-sm"}`}>{m.content}</div>
            </div>
          ))}
          {pending && (
            <div className="flex gap-3">
              <Mascot pose="think" size={36} className="shrink-0" />
              <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-400">
                <span className="inline-flex gap-1"><i className="dot" /><i className="dot" /><i className="dot" /></span>
              </div>
            </div>
          )}
          {!pending && widget === "team" && <TeamWidget existing={d.members} self={self} onSubmit={(members) => send(`Here is my team: ${members.map((m) => `${m.name} (${m.role})`).join(", ")}.`, { members })} />}
          {!pending && widget === "projects" && (
            <ProjectsWidget
              projects={d.projects}
              onChange={(projects) => run(() => patchOnboardingDraftAction({ projects }))}
              onConfirm={(projects) => send(`Confirmed projects: ${projects.filter((p) => p.confirmed).map((p) => p.name).join(", ")}.`, { projects })}
            />
          )}
          {!pending && (widget === "finish" || ready) && (
            <div className="card p-4 border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center gap-4">
                <Mascot pose="celebrate" size={56} />
                <div className="flex-1 text-sm">
                  <div className="font-semibold">Almost there</div>
                  <div className="text-slate-600">{d.orgName} · {d.members.length} team member{d.members.length === 1 ? "" : "s"} · {d.projects.filter((p) => p.confirmed).length} projects</div>
                </div>
                <button className="btn-primary" onClick={() => run(() => finishFromDraftAction(review))}>Next: connect calendar</button>
              </div>
              <label className="flex items-start gap-3 text-sm font-normal rounded-lg border border-emerald-200 bg-white p-3 cursor-pointer">
                <input type="checkbox" className="!w-auto mt-0.5" checked={review} onChange={(e) => setReview(e.target.checked)} />
                <span><span className="font-medium text-slate-900 block">Let me review AI tasks before my team is notified</span><span className="text-slate-500">Tasks stay as drafts on the meeting page until an admin approves them. You can change this later in Organization settings.</span></span>
              </label>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={bottom} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-slate-200 bg-white p-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={pending} autoFocus />
          <button className="btn-primary" disabled={pending || !input.trim()}>Send</button>
        </form>
      </div>

      <aside className="hidden lg:block border-l border-slate-200 bg-white p-5 overflow-y-auto">
        <h2 className="font-semibold text-sm mb-3">What Rocky has so far</h2>
        <Field label="Company" value={d.orgName} />
        <Field label="About the business" value={d.businessDescription} />
        <div className="mt-3">
          <div className="text-xs font-medium text-slate-500">Team ({d.members.length})</div>
          <ul className="text-sm mt-1 space-y-1">
            {d.members.map((m, i) => <li key={i}><span className="font-medium">{m.name}</span>{m.role ? ` · ${m.role}` : ""}</li>)}
          </ul>
        </div>
        <div className="mt-3">
          <div className="text-xs font-medium text-slate-500">Projects ({d.projects.filter((p) => p.confirmed).length} confirmed)</div>
          <ul className="text-sm mt-1 space-y-1">
            {d.projects.map((p, i) => <li key={i} className={p.confirmed ? "" : "text-slate-400"}>{p.confirmed ? "✓ " : "· "}{p.name}</li>)}
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
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`text-sm mt-0.5 ${value ? "" : "text-slate-400 italic"}`}>{value || "not yet"}</div>
    </div>
  );
}

function TeamWidget({ existing, self, onSubmit }: { existing: Member[]; self: { name: string; email: string }; onSubmit: (m: Member[]) => void }) {
  const seed = existing.length ? existing : [{ name: self.name, email: self.email, role: "", responsibilities: "" }];
  const [rows, setRows] = useState<Member[]>(seed.length < 2 ? [...seed, { name: "", email: null, role: "", responsibilities: "" }] : seed);
  const update = (i: number, patch: Partial<Member>) => setRows((r) => r.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="card p-4 space-y-3 ml-12">
      <div className="text-sm font-semibold">Your team</div>
      <p className="text-xs text-slate-500">Roles and “what they handle” are what the AI reads when assigning tasks, so be specific.</p>
      {rows.map((m, i) => (
        <div key={i} className="grid sm:grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
          <input placeholder="Name" value={m.name} onChange={(e) => update(i, { name: e.target.value })} />
          <input placeholder="Email" type="email" value={m.email ?? ""} onChange={(e) => update(i, { email: e.target.value || null })} />
          <input placeholder="Role (e.g. Account Manager)" value={m.role} onChange={(e) => update(i, { role: e.target.value })} />
          <input placeholder="What they typically handle" value={m.responsibilities} onChange={(e) => update(i, { responsibilities: e.target.value })} />
        </div>
      ))}
      <div className="flex justify-between">
        <button type="button" className="btn-secondary" onClick={() => setRows((r) => [...r, { name: "", email: null, role: "", responsibilities: "" }])}>+ Add person</button>
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
      <p className="text-xs text-slate-500">Untick anything that isn&apos;t a real project. Rename freely. Meetings and tasks get sorted into these.</p>
      {rows.map((p, i) => (
        <label key={i} className={`flex gap-3 items-start rounded-lg border p-3 cursor-pointer font-normal ${p.confirmed ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"}`}>
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
