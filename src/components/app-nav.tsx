"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mascot } from "@/components/mascot";
import { Icon, type IconName } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: IconName };

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
  const onSettings = settings.some((s) => active(s.href));
  const [settingsOpen, setSettingsOpen] = useState(onSettings);
  const showSettings = settingsOpen || onSettings;

  const links = (
    <>
      <form action="/search" className="px-1 pb-2">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" placeholder="Search  ⌘K" className="!py-1.5 !pl-9 text-sm" onKeyDown={(e) => { if (e.key === "Escape") (e.target as HTMLInputElement).blur(); }} />
        </div>
      </form>
      {items.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-display font-medium border-2 ${active(n.href) ? "bg-sky border-ink text-ink shadow-[2px_2px_0_0_#171b26]" : "border-transparent text-ink-soft hover:bg-paper-2"}`}>
          <Icon name={n.icon} size={18} className={active(n.href) ? "text-merle" : "text-muted"} />{n.label}
        </Link>
      ))}
      <Link href="/meetings/new" onClick={() => setOpen(false)} className="btn-accent w-full mt-3"><Icon name="mic" size={16} />Record a meeting</Link>
      <button
        type="button"
        onClick={() => setSettingsOpen((v) => !v)}
        aria-expanded={showSettings}
        className={`mt-3 w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-display font-medium border-2 ${onSettings ? "bg-sky border-ink text-ink shadow-[2px_2px_0_0_#171b26]" : "border-transparent text-ink-soft hover:bg-paper-2"}`}
      >
        <Icon name="settings" size={18} className={onSettings ? "text-merle" : "text-muted"} />
        Settings
        <Icon name="chevron" size={16} className="ml-auto text-muted transition-transform" style={{ transform: showSettings ? "rotate(180deg)" : "none" }} />
      </button>
      {showSettings && (
        <div className="ml-4 mt-1 border-l-2 border-line pl-2 space-y-0.5">
          {settings.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-1.5 text-sm ${active(n.href) ? "text-merle font-semibold bg-sky-soft" : "text-ink-soft hover:bg-paper-2"}`}>{n.label}</Link>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-paper border-b-2 border-ink flex items-center gap-3 px-4 py-2">
        <button aria-label="Menu" onClick={() => setOpen((o) => !o)} className="btn-ghost !px-2"><Icon name="menu" size={22} /></button>
        <Mascot pose="listen" size={32} />
        <div className="min-w-0"><div className="font-display font-bold leading-tight">scoop</div><div className="text-[11px] text-muted truncate">{orgName}</div></div>
        <Link href="/meetings/new" className="ml-auto btn-accent !py-1.5 text-xs"><Icon name="mic" size={14} />Record</Link>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-ink/40" onClick={() => setOpen(false)}>
          <nav className="absolute left-0 top-0 h-full w-72 bg-paper p-3 overflow-y-auto border-r-2 border-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1 pb-3"><span className="font-display font-semibold">Menu</span><button className="btn-ghost !px-2" onClick={() => setOpen(false)}><Icon name="close" size={18} /></button></div>
            {links}
            <div className="mt-6 border-t border-line pt-3 text-sm px-1">
              <div className="truncate font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
              <form action={signOut}><button className="text-xs text-muted hover:text-ink mt-2">Sign out</button></form>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r-2 border-ink bg-paper flex-col sticky top-0 h-screen">
        <div className="p-4 border-b-2 border-ink flex items-center gap-3">
          <Mascot pose="listen" size={44} />
          <div className="min-w-0"><div className="font-display font-bold text-lg tracking-tight leading-tight">scoop</div><div className="text-xs text-muted truncate">{orgName}</div></div>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">{links}</nav>
        <div className="p-4 border-t-2 border-ink text-sm bg-paper-2">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-muted">{user.email}</div>
          <form action={signOut}><button className="text-xs text-muted hover:text-ink mt-2">Sign out</button></form>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper border-t-2 border-ink grid grid-cols-5 text-[11px] font-display">
        {items.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 ${active(n.href) ? "text-merle font-semibold" : "text-muted"}`}><Icon name={n.icon} size={20} />{n.label}</Link>
        ))}
      </nav>
    </>
  );
}
