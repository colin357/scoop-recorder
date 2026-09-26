"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { GROUP_THRESHOLD, RECENT_COUNT } from "@/components/project-options";

type P = { id: string; name: string; color: string };

/** One button that opens a searchable project list, instead of a pill per project. */
export default function ProjectFilter({ projects, current, hrefFor, allHref }: { projects: P[]; current: string; hrefFor: Record<string, string>; allHref: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = projects.find((p) => p.id === current);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 0);
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const term = q.trim().toLowerCase();
  const matches = [...projects].sort((a, b) => a.name.localeCompare(b.name)).filter((p) => !term || p.name.toLowerCase().includes(term));
  const recent = !term && projects.length > GROUP_THRESHOLD ? projects.slice(0, RECENT_COUNT) : [];
  const row = (p: P) => (
    <Link key={p.id} href={hrefFor[p.id]} onClick={() => setOpen(false)} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-paper-2 ${p.id === current ? "bg-paper-2 font-medium" : ""}`}>
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} /><span className="truncate">{p.name}</span>
      {p.id === current && <Icon name="check" size={14} className="ml-auto shrink-0" />}
    </Link>
  );

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${selected ? "bg-ink text-paper border-ink" : "bg-paper text-ink-soft edge hover:bg-paper-2 hover:text-ink"}`}>
        {selected && <span className="h-2 w-2 rounded-full" style={{ background: selected.color }} />}
        {selected ? selected.name : "All projects"}
        <Icon name="chevron" size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-72 card p-2 shadow-lift pop-in">
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className="!py-1.5 text-sm mb-1.5" />
          <div className="max-h-72 overflow-y-auto space-y-0.5">
            {!term && <Link href={allHref} onClick={() => setOpen(false)} className={`flex items-center rounded-lg px-2.5 py-1.5 text-sm hover:bg-paper-2 ${!current ? "bg-paper-2 font-medium" : ""}`}>All projects</Link>}
            {recent.length > 0 && <><div className="px-2.5 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted">Recent</div>{recent.map(row)}<div className="px-2.5 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted">All projects</div></>}
            {matches.map(row)}
            {term && matches.length === 0 && <p className="px-2.5 py-2 text-sm text-muted">No project matches “{q}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
