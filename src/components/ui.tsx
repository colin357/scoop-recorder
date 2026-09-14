import Link from "next/link";
import { STATUS_LABEL, dueLabel } from "@/lib/utils";
import { Mascot, type MascotPose } from "@/components/mascot";
import { Icon, type IconName } from "@/components/icons";

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    draft: "bg-pink-soft text-ink",
    todo: "bg-paper-2 text-ink-soft",
    in_progress: "bg-ink text-paper",
    blocked: "bg-clay-soft text-clay",
    done: "bg-grass-soft text-grass",
    scheduled: "bg-paper-2 text-ink-soft",
    joining: "bg-butter-soft text-copper-deep",
    recording: "bg-copper text-paper",
    processing: "bg-butter-soft text-copper-deep",
    failed: "bg-clay-soft text-clay",
  };
  const dot: Record<string, string> = { recording: "bg-paper animate-pulse", processing: "bg-copper animate-pulse", joining: "bg-copper animate-pulse" };
  return (
    <span className={`badge gap-1.5 ${tone[status] ?? "bg-paper-2 text-ink-soft"}`}>
      {dot[status] && <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />}
      {STATUS_LABEL[status] ?? status.replace("_", " ")}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone: Record<string, string> = {
    low: "bg-paper-2 text-muted",
    medium: "bg-paper-2 text-ink-soft",
    high: "bg-butter text-copper-deep",
    urgent: "bg-copper text-paper",
  };
  return <span className={`badge capitalize ${tone[priority]}`}>{priority}</span>;
}

export function DueBadge({ date, status }: { date: Date | null; status?: string }) {
  const { label, tone } = dueLabel(date, status);
  const cls = { muted: "text-muted", warn: "text-copper-deep font-semibold", danger: "text-clay font-semibold" }[tone];
  return <span className={`text-xs inline-flex items-center gap-1 ${cls}`}>{tone !== "muted" && <Icon name="clock" size={12} />}{label}</span>;
}

export function ProjectChip({ project }: { project: { id: string; name: string; color: string } | null }) {
  if (!project) return null;
  return (
    <Link href={`/tasks?project=${project.id}`} className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink max-w-full min-w-0">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: project.color }} />
      <span className="truncate">{project.name}</span>
    </Link>
  );
}

const AVATAR_TONES = ["bg-ink text-paper", "bg-copper text-paper", "bg-alabaster text-ink", "bg-dust text-ink", "bg-butter text-copper-deep"];

/** Initials avatar. Deterministic tone per name so the same person always looks the same. */
export function Avatar({ name, size = "md", className = "" }: { name: string; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const dims = { xs: "h-5 w-5 text-[9px]", sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" }[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold ${dims} ${tone} ${className}`} title={name} aria-label={name}>
      {initials}
    </span>
  );
}

/** Stacked avatars, e.g. attendees. */
export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => <Avatar key={n + i} name={n} size="sm" className={`ring-2 ring-paper ${i > 0 ? "-ml-1.5" : ""}`} />)}
      {rest > 0 && <span className="-ml-1.5 inline-flex h-6 min-w-6 px-1 items-center justify-center rounded-full bg-paper-2 text-[10px] font-semibold text-muted ring-2 ring-paper">+{rest}</span>}
    </span>
  );
}

/** Consistent page header: title, optional description, actions on the right, optional back link. */
export function PageHeader({ title, description, actions, back, count }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }; count?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {back && <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-1"><Icon name="chevron" size={14} className="rotate-90" />{back.label}</Link>}
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5">
          {title}
          {typeof count === "number" && <span className="badge bg-paper-2 text-muted">{count}</span>}
        </h1>
        {description && <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, href, linkLabel = "View all", children }: { title: string; href?: string; linkLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold">{title}</h2>
      {children ?? (href && <Link href={href} className="text-sm font-medium text-ink-soft hover:text-ink inline-flex items-center gap-1">{linkLabel}<Icon name="chevron" size={14} className="-rotate-90" /></Link>)}
    </div>
  );
}

/** Icon in a soft chip, for stats and list rows. */
export function IconChip({ name, tone = "neutral", size = 44 }: { name: IconName; tone?: "neutral" | "accent" | "danger" | "success"; size?: number }) {
  const cls = { neutral: "bg-paper-2 text-ink-soft", accent: "bg-butter-soft text-copper-deep", danger: "bg-clay-soft text-clay", success: "bg-grass-soft text-grass" }[tone];
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-xl ${cls}`} style={{ height: size, width: size }}><Icon name={name} size={Math.round(size / 2)} /></span>;
}

export function Empty({ title, children, pose = "sleep", action, compact = false }: { title: string; children?: React.ReactNode; pose?: MascotPose; action?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`card text-center flex flex-col items-center ${compact ? "p-6" : "p-10"}`}>
      <Mascot pose={pose} size={compact ? 64 : 88} />
      <p className="font-display font-semibold mt-3">{title}</p>
      {children && <div className="text-sm text-muted mt-1 max-w-md">{children}</div>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Inline notice used for flash messages. */
export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn" | "danger"; children: React.ReactNode }) {
  const cls = {
    info: "bg-paper-2 border-line text-ink-soft",
    success: "bg-grass-soft border-grass/40 text-grass",
    warn: "bg-butter-soft border-copper/40 text-copper-deep",
    danger: "bg-clay-soft border-clay/40 text-clay",
  }[tone];
  return <p className={`rounded-xl border text-sm px-4 py-3 ${cls}`}>{children}</p>;
}
