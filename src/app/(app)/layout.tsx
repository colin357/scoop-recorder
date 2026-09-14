import { requireOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOutAction } from "@/app/actions/auth";
import MeetingPrompt from "@/components/meeting-prompt";
import AppNav, { type Alert, type NavItem } from "@/components/app-nav";
import CommandK from "@/components/command-k";
import BillingBanner from "@/components/billing-banner";
import Toast from "@/components/toast";
import SupportWidget from "@/components/support-widget";
import TimezoneSync from "@/components/timezone-sync";
import { setRequestTimeZone, TZ_COOKIE } from "@/lib/tz";
import { subDays } from "date-fns";
import { cookies } from "next/headers";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/meetings", label: "Meetings", icon: "video" },
  { href: "/tasks", label: "Tasks", icon: "check" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/settings/calendar", label: "Calendar", icon: "calendar" },
  { href: "/settings/team", label: "Team", icon: "users" },
];

/** Things that need a human decision right now, shown behind the bell. */
async function loadAlerts(orgId: string, memberId: string, isAdmin: boolean, billingStatus: string): Promise<Alert[]> {
  const now = new Date();
  const [undecided, overdue, drafts, failed, processing] = await Promise.all([
    db.calendarEvent.count({ where: { orgId, decision: "undecided", startAt: { gt: now } } }),
    db.task.count({ where: { orgId, assigneeId: memberId, status: { notIn: ["done", "draft"] }, dueDate: { lt: now } } }),
    isAdmin ? db.task.count({ where: { orgId, status: "draft" } }) : Promise.resolve(0),
    db.meeting.count({ where: { orgId, status: "failed", createdAt: { gt: subDays(now, 7) } } }),
    db.meeting.count({ where: { orgId, status: { in: ["recording", "processing"] } } }),
  ]);
  const alerts: Alert[] = [];
  if (isAdmin && billingStatus === "past_due") alerts.push({ id: "billing", text: "A payment failed. Update your card.", href: "/settings/billing", tone: "danger" });
  if (undecided) alerts.push({ id: "undecided", text: `${undecided} upcoming meeting${undecided === 1 ? "" : "s"} waiting for a record-or-skip call`, href: "/settings/calendar", tone: "accent" });
  if (drafts) alerts.push({ id: "drafts", text: `${drafts} AI task${drafts === 1 ? "" : "s"} waiting for your review`, href: "/meetings", tone: "accent" });
  if (overdue) alerts.push({ id: "overdue", text: `${overdue} of your task${overdue === 1 ? " is" : "s are"} overdue`, href: "/tasks?assignee=me&due=overdue", tone: "danger" });
  if (processing) alerts.push({ id: "processing", text: `Rocky is ${processing === 1 ? "in a meeting" : `in ${processing} meetings`} right now`, href: "/meetings", tone: "neutral" });
  if (failed) alerts.push({ id: "failed", text: `${failed} recording${failed === 1 ? "" : "s"} failed this week`, href: "/meetings", tone: "danger" });
  return alerts;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org, membership } = await requireOrg();
  setRequestTimeZone((await cookies()).get(TZ_COOKIE)?.value);
  const superAdmin = (process.env.SUPERADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).includes(user.email.toLowerCase());
  const alerts = await loadAlerts(org.id, membership.id, membership.isAdmin, org.billingStatus);
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      <AppNav items={NAV} orgName={org.name} user={{ name: user.name, email: user.email }} signOut={signOutAction} isAdmin={membership.isAdmin} superAdmin={superAdmin} alerts={alerts} />
      <main className="flex-1 min-w-0 p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto w-full max-w-6xl"><BillingBanner org={org} isAdmin={membership.isAdmin} />{children}</div>
      </main>
      <MeetingPrompt />
      <CommandK />
      <Toast />
      <SupportWidget />
      <TimezoneSync />
    </div>
  );
}
