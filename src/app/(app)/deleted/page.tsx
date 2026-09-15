import Link from "next/link";
import { Mascot } from "@/components/mascot";
import { Icon } from "@/components/icons";

const KINDS = {
  task: { noun: "task", back: { href: "/tasks", label: "Back to tasks" } },
  meeting: { noun: "meeting", back: { href: "/meetings", label: "Back to meetings" } },
} as const;

/** Confirmation shown after something is deleted, so the user lands somewhere deliberate instead of a 404. */
export default async function DeletedPage({ searchParams }: PageProps<"/deleted">) {
  const sp = await searchParams;
  const kind = KINDS[(typeof sp.type === "string" && sp.type in KINDS ? sp.type : "task") as keyof typeof KINDS];
  const title = typeof sp.title === "string" ? sp.title.slice(0, 160) : "";
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card p-8 max-w-lg w-full text-center space-y-4">
        <Mascot pose="celebrate" size={96} className="mx-auto" />
        <div>
          <div className="inline-flex items-center gap-1.5 badge bg-grass-soft text-grass mb-3"><Icon name="check" size={12} />Deleted</div>
          <h1 className="text-xl font-semibold tracking-tight">The {kind.noun} is gone.</h1>
          {title && <p className="text-ink-soft mt-1 break-words">“{title}”</p>}
          <p className="text-sm text-muted mt-2">Rocky buried it in the backyard. This can&apos;t be undone.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={kind.back.href} className="btn-primary">{kind.back.label}</Link>
          <Link href="/dashboard" className="btn-secondary">Home</Link>
        </div>
      </div>
    </div>
  );
}
