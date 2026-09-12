import Link from "next/link";
import { STATUS_LABEL, dueLabel } from "@/lib/utils";
import { Mascot, type MascotPose } from "@/components/mascot";

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    todo: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    blocked: "bg-red-100 text-red-700",
    done: "bg-emerald-100 text-emerald-700",
    scheduled: "bg-slate-100 text-slate-700",
    joining: "bg-amber-100 text-amber-700",
    recording: "bg-red-100 text-red-700",
    processing: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
  };
  return <span className={`badge ${tone[status] ?? "bg-slate-100 text-slate-700"}`}>{STATUS_LABEL[status] ?? status.replace("_", " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-sky-100 text-sky-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  return <span className={`badge ${tone[priority]}`}>{priority}</span>;
}

export function DueBadge({ date, status }: { date: Date | null; status?: string }) {
  const { label, tone } = dueLabel(date, status);
  const cls = { muted: "text-slate-500", warn: "text-amber-700 font-medium", danger: "text-red-600 font-medium" }[tone];
  return <span className={`text-xs ${cls}`}>{label}</span>;
}

export function ProjectChip({ project }: { project: { id: string; name: string; color: string } | null }) {
  if (!project) return null;
  return (
    <Link href={`/tasks?project=${project.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
      <span className="h-2 w-2 rounded-full" style={{ background: project.color }} />
      {project.name}
    </Link>
  );
}

export function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={`inline-flex h-${size} w-${size} items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700`} title={name}>
      {initials}
    </span>
  );
}

export function Empty({ title, children, pose = "sleep" }: { title: string; children?: React.ReactNode; pose?: MascotPose }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center">
      <Mascot pose={pose} size={80} />
      <p className="font-medium mt-3">{title}</p>
      {children && <div className="text-sm text-slate-500 mt-1">{children}</div>}
    </div>
  );
}
