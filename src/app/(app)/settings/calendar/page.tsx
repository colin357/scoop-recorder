import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { calendarProviderConfigured } from "@/lib/calendar";
import { recallConfigured } from "@/lib/recall";
import { fmtRelative } from "@/lib/utils";
import { disconnectCalendarAction, setRecordPolicyAction, syncNowAction } from "@/app/actions/calendar";
import { Mascot } from "@/components/mascot";
import WeekCalendar from "@/components/week-calendar";
import { loadWeek } from "@/lib/week";

export default async function CalendarSettingsPage({ searchParams }: PageProps<"/settings/calendar">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg();
  const [connections, events, week] = await Promise.all([
    db.calendarConnection.findMany({ where: { orgId: org.id }, include: { member: true }, orderBy: { createdAt: "asc" } }),
    db.calendarEvent.findMany({ where: { orgId: org.id, endAt: { gt: new Date() } }, orderBy: { startAt: "asc" }, include: { meeting: { select: { id: true, status: true } } } }),
    loadWeek(org.id, sp.week),
  ]);
  const google = calendarProviderConfigured("google");
  const microsoft = calendarProviderConfigured("microsoft");
  const mine = new Set(connections.filter((c) => c.memberId === membership.id).map((c) => c.provider));
  const showGoogle = !mine.has("google");
  const showMicrosoft = !mine.has("microsoft");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Mascot pose="listen" size={72} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar &amp; auto-record</h1>
          <p className="text-sm text-muted">Connect a calendar and Rocky will spot meetings with a video link and send the recorder for you.</p>
        </div>
      </div>

      {sp.connected && <p className="rounded-md bg-grass-soft border border-grass text-grass text-sm p-3">Calendar connected. Upcoming meetings are syncing.</p>}
      {typeof sp.error === "string" && (
        <p className="rounded-md bg-clay-soft border border-clay text-clay text-sm p-3">
          {sp.error === "not_configured" ? "That calendar provider is not configured yet (missing OAuth client ID/secret)." : decodeURIComponent(sp.error)}
        </p>
      )}
      {!recallConfigured() && <p className="rounded-md bg-butter-soft border border-copper text-copper-deep text-sm p-3">The recording bot is not configured (RECALL_API_KEY), so meetings can be tracked but not recorded yet.</p>}

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Connected calendars</h2>
        {connections.length === 0 && <p className="text-sm text-muted">No calendars connected yet.</p>}
        <ul className="divide-y divide-line/60">
          {connections.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                <div className="font-medium">{c.provider === "google" ? "Google Calendar" : "Microsoft 365"} · {c.email}</div>
                <div className="text-xs text-muted">
                  {c.member.name} · {c.syncedAt ? `synced ${fmtRelative(c.syncedAt)}` : "not synced yet"}
                  {c.syncError && <span className="text-clay"> · {c.syncError}</span>}
                </div>
              </div>
              <form action={disconnectCalendarAction.bind(null, c.id)}><button className="btn-ghost text-clay text-xs">Disconnect</button></form>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          {showGoogle && <a href="/api/calendar/google/start" className={`btn-secondary ${google ? "" : "opacity-50 pointer-events-none"}`}>Connect Google Calendar</a>}
          {showMicrosoft && <a href="/api/calendar/microsoft/start" className={`btn-secondary ${microsoft ? "" : "opacity-50 pointer-events-none"}`}>Connect Microsoft 365</a>}
          {connections.length > 0 && <form action={syncNowAction}><button className="btn-ghost">Sync now</button></form>}
        </div>
        {((showGoogle && !google) || (showMicrosoft && !microsoft)) && (
          <p className="text-xs text-muted">
            Missing: {[showGoogle && !google && "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET", showMicrosoft && !microsoft && "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET"].filter(Boolean).join(" and ")}. See README for setup.
          </p>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">When a meeting with a video link shows up</h2>
        <form action={setRecordPolicyAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64">
            <label htmlFor="policy">Rocky should</label>
            <select id="policy" name="policy" defaultValue={org.autoRecordPolicy} disabled={!membership.isAdmin}>
              <option value="auto">Record automatically</option>
              <option value="ask">Ask me first</option>
              <option value="off">Stay out (manual only)</option>
            </select>
          </div>
          {membership.isAdmin ? <button className="btn-primary">Save</button> : <p className="text-xs text-muted pb-2">Only admins can change this policy.</p>}
        </form>
        <p className="text-xs text-muted">
          {org.autoRecordPolicy === "auto" && "The recorder joins every meeting with a video link. You can still skip individual ones from the calendar."}
          {org.autoRecordPolicy === "ask" && "You get a pop-up before each meeting, and undecided ones are flagged on the calendar and in the bell."}
          {org.autoRecordPolicy === "off" && "Rocky only records meetings you add manually or mark Record on the calendar."}
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Calendar</h2>
          <span className="text-xs text-muted">{events.length} upcoming meeting{events.length === 1 ? "" : "s"} with a video link</span>
        </div>
        <WeekCalendar weekStart={week.weekStart} prev={week.prev} next={week.next} items={week.items} baseHref="/settings/calendar" />
        {connections.length > 0 && events.length === 0 && <p className="text-sm text-muted mt-2">Nothing with a video link in the next two weeks. Rocky checks every ten minutes.</p>}
      </section>
    </div>
  );
}
