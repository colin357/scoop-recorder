"use client";

import { useState, useTransition } from "react";
import { createProjectsBulkAction, suggestProjectsAction, type ProjectSuggestion } from "@/app/actions/team";
import { Mascot } from "@/components/mascot";

export default function SuggestProjects({ hasDescription }: { hasDescription: boolean }) {
  const [items, setItems] = useState<(ProjectSuggestion & { picked: boolean })[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const suggest = () =>
    start(async () => {
      setError(null);
      try {
        const res = await suggestProjectsAction();
        setItems(res.map((r) => ({ ...r, picked: true })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not get suggestions.");
      }
    });
  const create = () =>
    start(async () => {
      await createProjectsBulkAction((items ?? []).filter((i) => i.picked));
      setItems(null);
    });

  return (
    <div className="card p-5 space-y-3 border-dashed">
      <div className="flex items-center gap-3">
        <Mascot pose={pending ? "think" : "write"} size={48} />
        <div className="flex-1">
          <div className="font-semibold">Let Rocky guess your projects</div>
          <p className="text-sm text-muted">Uses your business description and recent meetings to spot clients, product lines and initiatives that deserve their own project.{!hasDescription && " Add a business description below for better guesses."}</p>
        </div>
        {!items && <button className="btn-primary" onClick={suggest} disabled={pending}>{pending ? "Thinking…" : "Suggest projects"}</button>}
      </div>
      {error && <p className="text-sm text-clay">{error}</p>}
      {items && items.length === 0 && <p className="text-sm text-muted">Nothing missing. Your projects already cover what Rocky can see.</p>}
      {items && items.length > 0 && (
        <div className="space-y-2">
          {items.map((it, i) => (
            <label key={i} className={`flex gap-3 items-start rounded-lg border p-3 cursor-pointer font-normal ${it.picked ? "border-merle bg-sky-soft" : "border-line"}`}>
              <input type="checkbox" className="!w-auto mt-1" checked={it.picked} onChange={(e) => setItems((xs) => xs!.map((x, j) => (j === i ? { ...x, picked: e.target.checked } : x)))} />
              <div className="text-sm">
                <div className="font-medium">{it.name}</div>
                <div className="text-ink-soft">{it.description}</div>
                <div className="text-xs text-muted mt-0.5">Why: {it.reason}</div>
              </div>
            </label>
          ))}
          <div className="flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setItems(null)}>Cancel</button>
            <button className="btn-primary" onClick={create} disabled={pending || !items.some((i) => i.picked)}>Create selected</button>
          </div>
        </div>
      )}
    </div>
  );
}
