"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";

type Member = { name: string; email: string; role: string; responsibilities: string };
type Project = { name: string; description: string };

export default function OnboardingWizard({ self }: { self: { name: string; email: string } }) {
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [members, setMembers] = useState<Member[]>([
    { name: self.name, email: self.email, role: "", responsibilities: "" },
    { name: "", email: "", role: "", responsibilities: "" },
  ]);
  const [projects, setProjects] = useState<Project[]>([{ name: "", description: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const updateMember = (i: number, patch: Partial<Member>) =>
    setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const updateProject = (i: number, patch: Partial<Project>) =>
    setProjects((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const finish = () =>
    start(async () => {
      setError(null);
      try {
        await completeOnboarding({ orgName, members, projects });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  return (
    <div className="mt-6 card p-6">
      <ol className="flex gap-4 text-sm mb-6">
        {["Company", "Team", "Projects"].map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${i === step ? "text-indigo-600 font-medium" : "text-slate-400"}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs border ${i <= step ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300"}`}>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label>Company name</label>
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." autoFocus />
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={!orgName.trim()} onClick={() => setStep(1)}>Next</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Add everyone who might get tasks. The <b>role</b> and <b>what they typically handle</b> are what the AI reads when deciding who owns each action item. Be specific.
          </p>
          {members.map((m, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4 grid gap-3 sm:grid-cols-2">
              <div><label>Name</label><input value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} /></div>
              <div><label>Email</label><input type="email" value={m.email} onChange={(e) => updateMember(i, { email: e.target.value })} disabled={i === 0} /></div>
              <div><label>Role</label><input value={m.role} onChange={(e) => updateMember(i, { role: e.target.value })} placeholder="Account Manager" /></div>
              <div className="sm:col-span-2">
                <label>What they typically handle</label>
                <textarea rows={2} value={m.responsibilities} onChange={(e) => updateMember(i, { responsibilities: e.target.value })}
                  placeholder="Client communication, sending proposals, scheduling follow-up calls, onboarding new accounts" />
              </div>
              {i > 0 && (
                <div className="sm:col-span-2 text-right">
                  <button className="btn-ghost text-red-600" onClick={() => setMembers((ms) => ms.filter((_, j) => j !== i))}>Remove</button>
                </div>
              )}
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setMembers((ms) => [...ms, { name: "", email: "", role: "", responsibilities: "" }])}>+ Add team member</button>
          <div className="flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn-primary" onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Projects let people filter their tasks. Meetings get matched to a project automatically. You can add more later.</p>
          {projects.map((p, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4 grid gap-3">
              <div><label>Project name</label><input value={p.name} onChange={(e) => updateProject(i, { name: e.target.value })} placeholder="Website redesign" /></div>
              <div><label>Description (optional)</label><input value={p.description} onChange={(e) => updateProject(i, { description: e.target.value })} placeholder="Helps the AI route meetings to the right project" /></div>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setProjects((ps) => [...ps, { name: "", description: "" }])}>+ Add project</button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={finish} disabled={pending}>{pending ? "Saving…" : "Next: connect calendar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
