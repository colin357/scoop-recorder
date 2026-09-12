"use client";

import Link from "next/link";
import { useTransition } from "react";
import { approveTasksAction, discardDraftAction } from "@/app/actions/meetings";
import { Mascot } from "@/components/mascot";

type Draft = { id: string; title: string; assignee: string | null; due: string };

export default function ReviewDrafts({ meetingId, drafts }: { meetingId: string; drafts: Draft[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="card p-5 border-pink bg-pink-soft space-y-3">
      <div className="flex items-center gap-3">
        <Mascot pose="write" size={56} />
        <div className="flex-1">
          <div className="font-semibold">{drafts.length} drafted task{drafts.length === 1 ? "" : "s"} waiting for your review</div>
          <p className="text-sm text-ink-soft">Nobody has been notified yet. Approve what&apos;s right, open a task to edit it, or discard it.</p>
        </div>
        <button className="btn-primary" disabled={pending} onClick={() => start(() => approveTasksAction(meetingId))}>Approve all</button>
      </div>
      <ul className="divide-y divide-pink/40">
        {drafts.map((d) => (
          <li key={d.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
            <Link href={`/tasks/${d.id}`} className="flex-1 min-w-48 font-medium hover:text-merle">{d.title}</Link>
            <span className="text-muted">{d.assignee ?? "Unassigned"} · due {d.due}</span>
            <span className="flex gap-1">
              <button className="btn-secondary !py-1 text-xs" disabled={pending} onClick={() => start(() => approveTasksAction(meetingId, [d.id]))}>Approve</button>
              <button className="btn-ghost !py-1 text-xs text-clay" disabled={pending} onClick={() => start(() => discardDraftAction(d.id))}>Discard</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
