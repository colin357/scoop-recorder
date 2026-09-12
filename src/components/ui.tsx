import Link from "next/link";
import { STATUS_LABEL, dueLabel } from "@/lib/utils";
import { Mascot, type MascotPose } from "@/components/mascot";

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    draft: "bg-pink-soft text-ink",
    todo: "bg-paper text-ink",
    in_progress: "bg-sky text-ink",
    blocked: "bg-clay-soft text-ink",
    done: "bg-grass text-paper",
    scheduled: "bg-paper text-ink",
    joining: "bg-butter-soft text-ink",
    recording: "bg-clay text-paper",
    processing: "bg-sky text-ink",
    failed: "bg-clay-soft text-ink",
  };
  return <span className={`badge ${tone[status] ?? "bg-paper text-ink"}`}>{STATUS_LABEL[status] ?? status.replace("_", " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone: Record<string, string> = {
    low: "bg-paper text-muted border-muted",
    medium: "bg-sky text-ink",
    high: "bg-butter text-ink",
    urgent: "bg-clay text-paper",
  };
  return <span className={`badge ${tone[priority]}`}>{priority}</span>;
}

export function DueBadge({ date, status }: { date: Date | null; status?: string }) {
  const { label, tone } = dueLabel(date, status);
  const cls = { muted: "text-muted", warn: "text-copper-deep font-semibold", danger: "text-clay font-semibold" }[tone];
  return <span className={`text-xs ${cls}`}>{label}</span>;
}

export function ProjectChip({ project }: { project: { id: string; name: string; color: string } | null }) {
  if (!project) return null;
  return (
    <Link href={`/tasks?project=${project.id}`} className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink">
      <span className="h-2 w-2 rounded-full" style={{ background: project.color }} />
      {project.name}
    </Link>
  );
}

export function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`inline-flex h-${size} w-${size} items-center justify-center rounded-full border-2 border-ink bg-butter text-[10px] font-bold text-ink`} title={name}>
      {initials}
    </span>
  );
}

export function Empty({ title, children, pose = "sleep" }: { title: string; children?: React.ReactNode; pose?: MascotPose }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center">
      <Mascot pose={pose} size={80} />
      <p className="font-display font-semibold mt-3">{title}</p>
      {children && <div className="text-sm text-muted mt-1">{children}</div>}
    </div>
  );
}
