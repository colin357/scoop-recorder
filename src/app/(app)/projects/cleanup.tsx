"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveInactiveProjectsAction, archiveProjectAction, mergeProjectsAction, suggestProjectCleanupAction } from "@/app/actions/projects";
import type { ProjectCleanup } from "@/lib/ai";
import { Mascot } from "@/components/mascot";

type Names = Record<string, string>;

/** "Archive inactive" in one click, and Rocky's merge/archive proposals to approve one by one. */
export default function ProjectCleanupPanel({ names, inactiveCount, inactiveDays }: { names: Names; inactiveCount: number; inactiveDays: number }) {
  const router = useRouter();
  const [plan, setPlan] = useState<ProjectCleanup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ask = () => start(async () => {
    setError(null);
    try { setPlan(await suggestProjectCleanupAction()); } catch (e) { setError(e instanceof Error ? e.message : "Rocky couldn't look right now."); }
  });
  const run = (fn: () => Promise<unknown>, drop: () => void) => start(async () => { await fn(); drop(); router.refresh(); });
  const dropMerge = (i: number) => setPlan((p) => p && { ...p, merges: p.merges.filter((_, j) => j !== i) });
  const dropArchive = (i: number) => setPlan((p) => p && { ...p, archives: p.archives.filter((_, j) => j !== i) });
  const empty = plan && plan.merges.length === 0 && plan.archives.length === 0;

  return (
    <section className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Mascot pose="think" size={40} />
        <div className="flex-1 min-w-52 text-sm">
          <div className="font-medium">Tidy up your projects</div>
          <div className="text-xs text-muted">{inactiveCount > 0 ? `${inactiveCount} project${inactiveCount === 1 ? " has" : "s have"} had nothing happen in ${inactiveDays} days.` : "Rocky can spot duplicates and projects that look finished."}</div>
        </div>
        {inactiveCount > 0 && <button type="button" className="btn-secondary !py-1.5 text-sm" disabled={pending} onClick={() => run(() => archiveInactiveProjectsAction(), () => {})}>Archive {inactiveCount} inactive</button>}
        {!plan && <button type="button" className="btn-primary !py-1.5 text-sm" disabled={pending} onClick={ask}>{pending ? "Looking…" : "Suggest cleanup"}</button>}
      </div>
      {error && <p className="text-sm text-clay">{error}</p>}
      {plan && (
        <ul className="divide-y divide-line/60 border-t edge">
          {plan.merges.map((m, i) => (
            <li key={`m${i}`} className="py-2.5 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-52 text-sm">
                Merge <b>{m.sourceIds.map((id) => names[id]).join(", ")}</b> into <b>{names[m.targetId]}</b>
                <div className="text-xs text-muted">{m.reason}</div>
              </div>
              <button type="button" className="btn-secondary !py-1 text-xs" disabled={pending} onClick={() => run(async () => { for (const s of m.sourceIds) await mergeProjectsAction(s, m.targetId); }, () => dropMerge(i))}>Merge</button>
              <button type="button" className="btn-ghost !py-1 text-xs" onClick={() => dropMerge(i)}>Skip</button>
            </li>
          ))}
          {plan.archives.map((a, i) => (
            <li key={`a${i}`} className="py-2.5 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-52 text-sm">
                Archive <b>{names[a.projectId]}</b>
                <div className="text-xs text-muted">{a.reason}</div>
              </div>
              <button type="button" className="btn-secondary !py-1 text-xs" disabled={pending} onClick={() => run(() => archiveProjectAction(a.projectId), () => dropArchive(i))}>Archive</button>
              <button type="button" className="btn-ghost !py-1 text-xs" onClick={() => dropArchive(i)}>Skip</button>
            </li>
          ))}
          {empty && <li className="py-2.5 text-sm text-muted flex items-center justify-between">Nothing left to tidy. <button type="button" className="btn-ghost !py-1 text-xs" onClick={() => setPlan(null)}>Close</button></li>}
        </ul>
      )}
    </section>
  );
}
