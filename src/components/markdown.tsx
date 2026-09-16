import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Small, safe Markdown renderer for AI answers: paragraphs, bullet and
 * numbered lists, headings, **bold**, *italic*, `code`, and [m:ss] transcript
 * timestamps turned into links when a meeting id is given. Renders React
 * elements only, never raw HTML.
 */
export default function Markdown({ text, meetingId, className = "" }: { text: string; meetingId?: string | null; className?: string }) {
  const blocks = parseBlocks(text.replace(/\r\n/g, "\n"));
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "ul") return <ul key={i} className="list-disc pl-5 space-y-1">{b.items.map((it, j) => <li key={j}>{inline(it, meetingId)}</li>)}</ul>;
        if (b.type === "ol") return <ol key={i} className="list-decimal pl-5 space-y-1">{b.items.map((it, j) => <li key={j}>{inline(it, meetingId)}</li>)}</ol>;
        if (b.type === "h") return <div key={i} className="font-semibold text-ink">{inline(b.text, meetingId)}</div>;
        if (b.type === "p") return <p key={i}>{inline(b.text, meetingId)}</p>;
        return null;
      })}
    </div>
  );
}

type Block = { type: "p" | "h"; text: string } | { type: "ul" | "ol"; items: string[] };

function parseBlocks(text: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push({ type: "p", text: para.join("\n") }); para = []; } };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const h = /^\s*#{1,6}\s+(.*)$/.exec(line);
    if (!line.trim()) { flush(); continue; }
    if (ul || ol) {
      flush();
      const type = ul ? "ul" : "ol";
      const item = (ul ?? ol)![1];
      const last = out[out.length - 1];
      if (last && last.type === type) last.items.push(item); else out.push({ type, items: [item] });
      continue;
    }
    if (h) { flush(); out.push({ type: "h", text: h[1] }); continue; }
    // Continuation of a list item (indented text under a bullet).
    const last = out[out.length - 1];
    if (/^\s{2,}/.test(raw) && last && (last.type === "ul" || last.type === "ol") && para.length === 0) { last.items[last.items.length - 1] += " " + line.trim(); continue; }
    para.push(line);
  }
  flush();
  return out;
}

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|\[(?:\d{1,2}:)?\d{1,2}:\d{2}\])/g;

function inline(text: string, meetingId?: string | null): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = text.split("\n");
  lines.forEach((line, li) => {
    let last = 0, m: RegExpExecArray | null, k = 0;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(line))) {
      if (m.index > last) nodes.push(line.slice(last, m.index));
      const t = m[0]; const key = `${li}-${k++}`;
      if (t.startsWith("**")) nodes.push(<strong key={key} className="font-semibold text-ink">{t.slice(2, -2)}</strong>);
      else if (t.startsWith("`")) nodes.push(<code key={key} className="rounded bg-paper px-1 py-0.5 text-[0.85em] ring-1 ring-line">{t.slice(1, -1)}</code>);
      else if (t.startsWith("[")) {
        const sec = toSeconds(t.slice(1, -1));
        nodes.push(meetingId && sec != null
          ? <Link key={key} href={`/meetings/${meetingId}?t=${sec}`} className="inline-flex items-center gap-0.5 rounded bg-flame-soft px-1 text-flame-deep font-medium hover:underline">▶ {t.slice(1, -1)}</Link>
          : t);
      } else nodes.push(<em key={key}>{t.slice(1, -1)}</em>);
      last = m.index + t.length;
    }
    if (last < line.length) nodes.push(line.slice(last));
    if (li < lines.length - 1) nodes.push(<br key={`br-${li}`} />);
  });
  return nodes;
}

function toSeconds(stamp: string) {
  const parts = stamp.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
