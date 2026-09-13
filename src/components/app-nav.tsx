"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { LogoMark, Wordmark } from "@/components/logo";

export type NavItem = { href: string; label: string; icon: IconName };
export type Alert = { id: string; text: string; href: string; tone: "accent" | "danger" | "neutral" };

const COLLAPSE_KEY = "scoop.nav.collapsed";

export default function AppNav({ items, orgName, user, signOut, isAdmin, superAdmin, alerts = [] }: {
  items: NavItem[]; orgName: string; user: { name: string; email: string }; signOut: () => Promise<void>; isAdmin: boolean; superAdmin: boolean; alerts?: Alert[];
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    // Restore the saved state after hydration (deferred so the server and first client render match).
    const t = setTimeout(() => { try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch {} }, 0);
    return () => clearTimeout(t);
  }, []);
  const toggleCollapsed = () => setCollapsed((c) => { try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch {} return !c; });
  const path = usePathname();
  const active = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  const settings = [
    { href: "/settings/profile", label: "Profile" },
    ...(isAdmin ? [{ href: "/settings/organization", label: "Organization" }, { href: "/settings/billing", label: "Billing" }, { href: "/settings/audit", label: "Audit log" }] : []),
    ...(superAdmin ? [{ href: "/admin", label: "Usage (operator)" }] : []),
  ];
  const onSettings = settings.some((s) => active(s.href));
  const [settingsOpen, setSettingsOpen] = useState(onSettings);
  const showSettings = settingsOpen || onSettings;

  const navLink = (n: NavItem, compact: boolean) => (
    <Link key={n.href} href={n.href} onClick={() => setOpen(false)} title={compact ? n.label : undefined} className={`flex items-center gap-2.5 rounded-xl text-sm font-display font-medium transition ${compact ? "justify-center px-0 py-2.5" : "px-3 py-2"} ${active(n.href) ? "bg-ink text-paper shadow-btn" : "text-ink-soft hover:bg-paper-2 hover:text-ink"}`}>
      <Icon name={n.icon} size={18} className={active(n.href) ? "text-paper" : "text-muted"} />{!compact && n.label}
    </Link>
  );

  const links = (compact = false) => (
    <>
      {!compact && (
        <form action="/search" className="px-1 pb-2">
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" placeholder="Search  ⌘K" className="!py-1.5 !pl-9 text-sm" onKeyDown={(e) => { if (e.key === "Escape") (e.target as HTMLInputElement).blur(); }} />
          </div>
        </form>
      )}
      {compact && <Link href="/search" title="Search" className="flex justify-center rounded-xl py-2.5 text-muted hover:bg-paper-2 hover:text-ink"><Icon name="search" size={18} /></Link>}
      {items.map((n) => navLink(n, compact))}
      <Link href="/meetings/new" onClick={() => setOpen(false)} title="Record a meeting" className={`btn-accent mt-3 ${compact ? "!px-0 w-full" : "w-full"}`}><Icon name="mic" size={16} />{!compact && "Record a meeting"}</Link>
      {compact ? (
        <Link href={settings[0].href} title="Settings" className={`mt-3 flex justify-center rounded-xl py-2.5 ${onSettings ? "bg-paper-2 text-ink" : "text-muted hover:bg-paper-2 hover:text-ink"}`}><Icon name="settings" size={18} /></Link>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={showSettings}
            className={`mt-3 w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-display font-medium transition ${onSettings ? "bg-paper-2 text-ink" : "text-ink-soft hover:bg-paper-2 hover:text-ink"}`}
          >
            <Icon name="settings" size={18} className={onSettings ? "text-ink" : "text-muted"} />
            Settings
            <Icon name="chevron" size={16} className="ml-auto text-muted transition-transform" style={{ transform: showSettings ? "rotate(180deg)" : "none" }} />
          </button>
          {showSettings && (
            <div className="ml-4 mt-1 border-l edge pl-2 space-y-0.5">
              {settings.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-1.5 text-sm ${active(n.href) ? "text-ink font-semibold bg-paper-2" : "text-ink-soft hover:bg-paper-2"}`}>{n.label}</Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-paper border-b edge flex items-center gap-3 px-4 py-2">
        <button aria-label="Menu" onClick={() => setOpen((o) => !o)} className="btn-ghost !px-2"><Icon name="menu" size={22} /></button>
        <LogoMark size={32} />
        <div className="min-w-0"><Wordmark height={14} /><div className="text-[11px] text-muted truncate">{orgName}</div></div>
        <div className="ml-auto flex items-center gap-1">
          <Bell alerts={alerts} />
          <Link href="/meetings/new" className="btn-accent !py-1.5 text-xs"><Icon name="mic" size={14} />Record</Link>
        </div>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-ink/40" onClick={() => setOpen(false)}>
          <nav className="absolute left-0 top-0 h-full w-72 bg-paper p-3 overflow-y-auto border-r edge" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1 pb-3"><span className="font-display font-semibold">Menu</span><button className="btn-ghost !px-2" onClick={() => setOpen(false)}><Icon name="close" size={18} /></button></div>
            {links()}
            <div className="mt-6 border-t border-line pt-3 text-sm px-1">
              <div className="truncate font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
              <form action={signOut}><button className="text-xs text-muted hover:text-ink mt-2">Sign out</button></form>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex shrink-0 border-r edge bg-paper flex-col sticky top-0 z-30 h-screen transition-[width] duration-200 ${collapsed ? "w-[72px]" : "w-64"}`}>
        <div className={`pt-4 pb-3 flex items-center gap-3 ${collapsed ? "px-3 justify-center" : "px-4"}`}>
          <Link href="/dashboard" className="shrink-0" title="Home"><LogoMark size={40} /></Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <Wordmark height={18} className="mb-0.5" />
              <div className="text-xs text-muted truncate flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-copper" />{orgName}</div>
            </div>
          )}
          {!collapsed && <Bell alerts={alerts} />}
        </div>
        {collapsed && <div className="flex justify-center pb-1"><Bell alerts={alerts} /></div>}
        <nav className={`pb-3 flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-3"}`}>{links(collapsed)}</nav>
        <div className={`py-3 border-t edge ${collapsed ? "px-2" : "px-3"}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Avatar name={user.name} size="md" />
              <form action={signOut}><button className="btn-ghost !px-2 !py-1.5 text-xs" title="Sign out" aria-label="Sign out"><Icon name="close" size={16} /></button></form>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <Avatar name={user.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium leading-tight">{user.name}</div>
                <div className="truncate text-[11px] text-muted">{user.email}</div>
              </div>
              <form action={signOut}><button className="btn-ghost !px-2 !py-1.5 text-xs" title="Sign out" aria-label="Sign out"><Icon name="close" size={16} /></button></form>
            </div>
          )}
          <button type="button" onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={`mt-2 w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-muted hover:bg-paper-2 hover:text-ink ${collapsed ? "justify-center" : ""}`}>
            <Icon name="sidebar" size={14} />{!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper border-t edge grid grid-cols-5 text-[11px] font-display">
        {items.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 ${active(n.href) ? "text-ink font-semibold" : "text-muted"}`}><Icon name={n.icon} size={20} />{n.label}</Link>
        ))}
      </nav>
    </>
  );
}

function Bell({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const urgent = alerts.some((a) => a.tone === "danger");
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${alerts.length ? ` (${alerts.length})` : ""}`} aria-expanded={open} className={`relative h-9 w-9 rounded-xl flex items-center justify-center transition ${open ? "bg-paper-2 text-ink" : "text-muted hover:bg-paper-2 hover:text-ink"}`}>
        <Icon name="bell" size={18} />
        {alerts.length > 0 && <span className={`absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold leading-4 text-paper text-center ${urgent ? "bg-clay" : "bg-copper"}`}>{alerts.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 md:left-0 md:right-auto top-11 z-50 w-80 card shadow-lift p-1.5 pop-in">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted font-display">Needs you</div>
          {alerts.length === 0 ? (
            <div className="px-3 pb-3 pt-1 text-sm text-muted">All clear. Nothing waiting on you.</div>
          ) : (
            <ul className="space-y-0.5">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} onClick={() => setOpen(false)} className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-paper-2">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${a.tone === "danger" ? "bg-clay" : a.tone === "accent" ? "bg-copper" : "bg-dust"}`} />
                    <span className="text-ink-soft">{a.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
