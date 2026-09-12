import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meetings", label: "Meetings" },
  { href: "/tasks", label: "Tasks" },
  { href: "/projects", label: "Projects" },
  { href: "/settings/team", label: "Team" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireOrg();
  return (
    <div className="flex-1 flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="font-semibold tracking-tight">Scoop</div>
          <div className="text-xs text-slate-500 truncate">{org.name}</div>
        </div>
        <nav className="p-2 flex-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              {n.label}
            </Link>
          ))}
          <Link href="/meetings/new" className="btn-primary w-full mt-3">+ Record a meeting</Link>
        </nav>
        <div className="p-4 border-t border-slate-200 text-sm">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
          <form action={signOutAction}><button className="text-xs text-slate-500 hover:text-slate-900 mt-2">Sign out</button></form>
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full">{children}</main>
    </div>
  );
}
