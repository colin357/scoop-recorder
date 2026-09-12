import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import MeetingPrompt from "@/components/meeting-prompt";
import { Mascot } from "@/components/mascot";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/meetings", label: "Meetings", icon: "🎥" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/settings/calendar", label: "Calendar", icon: "📅" },
  { href: "/settings/team", label: "Team", icon: "👥" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireOrg();
  return (
    <div className="flex-1 flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Mascot pose="listen" size={40} />
          <div className="min-w-0">
            <div className="font-semibold tracking-tight">Scoop</div>
            <div className="text-xs text-slate-500 truncate">{org.name}</div>
          </div>
        </div>
        <nav className="p-2 flex-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
              <span className="text-base leading-none" aria-hidden>{n.icon}</span>{n.label}
            </Link>
          ))}
          <Link href="/meetings/new" className="btn-primary w-full mt-3 brand-mark border-0">🎙 Record a meeting</Link>
        </nav>
        <div className="p-4 border-t border-slate-200 text-sm">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
          <form action={signOutAction}><button className="text-xs text-slate-500 hover:text-slate-900 mt-2">Sign out</button></form>
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full">{children}</main>
      <MeetingPrompt />
    </div>
  );
}
