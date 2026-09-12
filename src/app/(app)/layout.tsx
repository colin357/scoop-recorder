import { requireOrg } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import MeetingPrompt from "@/components/meeting-prompt";
import AppNav, { type NavItem } from "@/components/app-nav";
import CommandK from "@/components/command-k";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/meetings", label: "Meetings", icon: "video" },
  { href: "/tasks", label: "Tasks", icon: "check" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/settings/calendar", label: "Calendar", icon: "calendar" },
  { href: "/settings/team", label: "Team", icon: "users" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org, membership } = await requireOrg();
  const superAdmin = (process.env.SUPERADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).includes(user.email.toLowerCase());
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      <AppNav items={NAV} orgName={org.name} user={{ name: user.name, email: user.email }} signOut={signOutAction} isAdmin={membership.isAdmin} superAdmin={superAdmin} />
      <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8 max-w-6xl w-full min-w-0">{children}</main>
      <MeetingPrompt />
      <CommandK />
    </div>
  );
}
