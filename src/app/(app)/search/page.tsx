import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDate, safeJson } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/recall";
import { Empty, StatusBadge } from "@/components/ui";

function snippet(text: string, q: string, span = 90) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, span * 2) + (text.length > span * 2 ? "…" : "");
  const start = Math.max(0, i - span);
  const end = Math.min(text.length, i + q.length + span);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { org } = await requireOrg();
  const [meetings, tasks] = q
    ? await Promise.all([
        db.meeting.findMany({
          where: { orgId: org.id, OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { transcript: { contains: q, mode: "insensitive" } }] },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        db.task.findMany({
          where: { orgId: org.id, status: { not: "draft" }, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { sourceQuote: { contains: q, mode: "insensitive" } }] },
          include: { assignee: true, meeting: { select: { id: true, title: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search meetings, transcripts, and tasks… e.g. pricing" autoFocus />
        <button className="btn-primary">Search</button>
      </form>
      {q && meetings.length === 0 && tasks.length === 0 && <Empty title={`Nothing found for “${q}”`} pose="think" />}
      {meetings.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Meetings ({meetings.length})</h2>
          <ul className="card divide-y divide-line/60">
            {meetings.map((m) => {
              const segs = safeJson<TranscriptSegment[]>(m.transcript, []);
              const hit = segs.find((s) => s.text.toLowerCase().includes(q.toLowerCase()));
              const text = hit ? `${hit.speaker}: ${hit.text}` : m.summary ?? "";
              return (
                <li key={m.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Link href={hit ? `/meetings/${m.id}?t=${hit.startSec}` : `/meetings/${m.id}`} className="font-medium hover:text-merle">{m.title}</Link>
                    <span className="text-xs text-muted">{fmtDate(m.startedAt ?? m.createdAt)}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  {text && <p className="text-sm text-ink-soft mt-1">{snippet(text, q)}</p>}
                  {hit && <span className="text-xs text-merle">▶ jump to this moment</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {tasks.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Tasks ({tasks.length})</h2>
          <ul className="card divide-y divide-line/60">
            {tasks.map((t) => (
              <li key={t.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Link href={`/tasks/${t.id}`} className="font-medium hover:text-merle">{t.title}</Link>
                  <StatusBadge status={t.status} />
                  <span className="text-xs text-muted">{t.assignee?.name ?? "Unassigned"} · due {fmtDate(t.dueDate)}</span>
                </div>
                <p className="text-sm text-ink-soft mt-1">{snippet(t.description || t.sourceQuote || "", q)}</p>
                {t.meeting && <Link href={`/meetings/${t.meeting.id}`} className="text-xs text-muted hover:text-ink">from “{t.meeting.title}”</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
