"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mascot } from "@/components/mascot";

export type NavItem = { href: string; label: string; icon: string };

export default function AppNav({ items, orgName, user, signOut, isAdmin, superAdmin }: {
  items: NavItem[]; orgName: string; user: { name: string; email: string }; signOut: () => Promise<void>; isAdmin: boolean; superAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const active = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  const settings = [
    { href: "/settings/profile", label: "Profile" },
    ...(isAdmin ? [{ href: "/settings/organization", label: "Organization" }, { href: "/settings/audit", label: "Audit log" }] : []),
    ...(superAdmin ? [{ href: "/admin", label: "Usage (operator)" }] : []),
  ];

  const links = (
    <>
      <form action="/search" className="px-1 pb-2">
        <input name="q" placeholder="Search…  ⌘K" className="!py-1.5 text-sm" onKeyDown={(e) => { if (e.key === "Escape") (e.target as HTMLInputElement).blur(); }} />
      </form>
      {items.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${active(n.href) ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-100"}`}>
          <span className="text-base leading-none" aria-hidden>{n.icon}</span>{n.label}
        </Link>
      ))}
      <Link href="/meetings/new" onClick={() => setOpen(false)} className="btn-primary w-full mt-3 brand-mark border-0">🎙 Record a meeting</Link>
      <div className="mt-4 px-3 text-[11px] uppercase tracking-wide text-slate-400">Settings</div>
      {settings.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`block rounded-md px-3 py-1.5 text-sm ${active(n.href) ? "text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>{n.label}</Link>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 flex items-center gap-3 px-4 py-2">
        <button aria-label="Menu" onClick={() => setOpen((o) => !o)} className="btn-ghost !px-2 text-xl leading-none">☰</button>
        <Mascot pose="listen" size={32} />
        <div className="min-w-0"><div className="font-semibold leading-tight">Scoop</div><div className="text-[11px] text-slate-500 truncate">{orgName}</div></div>
        <Link href="/meetings/new" className="ml-auto btn-primary !py-1.5 text-xs brand-mark border-0">🎙 Record</Link>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
          <nav className="absolute left-0 top-0 h-full w-72 bg-white p-3 overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1 pb-3"><span className="font-semibold">Menu</span><button className="btn-ghost !px-2" onClick={() => setOpen(false)}>✕</button></div>
            {links}
            <div className="mt-6 border-t border-slate-200 pt-3 text-sm px-1">
              <div className="truncate font-medium">{user.name}</div>
              <div className="truncate text-xs text-slate-500">{user.email}</div>
              <form action={signOut}><button className="text-xs text-slate-500 hover:text-slate-900 mt-2">Sign out</button></form>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-slate-200 bg-white flex-col sticky top-0 h-screen">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Mascot pose="listen" size={40} />
          <div className="min-w-0"><div className="font-semibold tracking-tight">Scoop</div><div className="text-xs text-slate-500 truncate">{orgName}</div></div>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">{links}</nav>
        <div className="p-4 border-t border-slate-200 text-sm">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
          <form action={signOut}><button className="text-xs text-slate-500 hover:text-slate-900 mt-2">Sign out</button></form>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-5 text-[11px]">
        {items.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center py-2 ${active(n.href) ? "text-indigo-700" : "text-slate-500"}`}><span className="text-lg leading-none" aria-hidden>{n.icon}</span>{n.label}</Link>
        ))}
      </nav>
    </>
  );
}
