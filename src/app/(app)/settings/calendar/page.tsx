import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { calendarProviderConfigured } from "@/lib/calendar";
import { recallConfigured } from "@/lib/recall";
import { fmtDateTime, fmtRelative, PLATFORM_LABEL } from "@/lib/utils";
import { disconnectCalendarAction, setRecordPolicyAction, syncNowAction } from "@/app/actions/calendar";
import { Mascot } from "@/components/mascot";
import UpcomingList from "@/components/upcoming-list";

export default async function CalendarSettingsPage({ searchParams }: PageProps<"/settings/calendar">) {
  const sp = await searchParams;
  const { org, membership } = await requireOrg();
  const [connections, events] = await Promise.all([
    db.calendarConnection.findMany({ where: { orgId: org.id }, include: { member: true }, orderBy: { createdAt: "asc" } }),
    db.calendarEvent.findMany({ where: { orgId: org.id, endAt: { gt: new Date() } }, orderBy: { startAt: "asc" }, include: { meeting: { select: { id: true, status: true } } } }),
  ]);
  const google = calendarProviderConfigured("google");
  const microsoft = calendarProviderConfigured("microsoft");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Mascot pose="listen" size={72} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar &amp; auto-record</h1>
          <p className="text-sm text-slate-500">Connect a calendar and Rocky will spot meetings with a video link and send the recorder for you.</p>
        </div>
      </div>

      {sp.connected && <p className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3">Calendar connected. Upcoming meetings are syncing.</p>}
      {typeof sp.error === "string" && (
        <p className="rounded-md bg-red-50 border border-red-200 text-red-800 text-sm p-3">
          {sp.error === "not_configured" ? "That calendar provider is not configured yet (missing OAuth client ID/secret)." : decodeURIComponent(sp.error)}
        </p>
      )}
      {!recallConfigured() && <p className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">The recording bot is not configured (RECALL_API_KEY), so meetings can be tracked but not recorded yet.</p>}

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Connected calendars</h2>
        {connections.length === 0 && <p className="text-sm text-slate-500">No calendars connected yet.</p>}
        <ul className="divide-y divide-slate-100">
          {connections.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                <div className="font-medium">{c.provider === "google" ? "Google Calendar" : "Microsoft 365"} · {c.email}</div>
                <div className="text-xs text-slate-500">
                  {c.member.name} · {c.syncedAt ? `synced ${fmtRelative(c.syncedAt)}` : "not synced yet"}
                  {c.syncError && <span className="text-red-600"> · {c.syncError}</span>}
                </div>
              </div>
              <form action={disconnectCalendarAction.bind(null, c.id)}><button className="btn-ghost text-red-600 text-xs">Disconnect</button></form>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href="/api/calendar/google/start" className={`btn-secondary ${google ? "" : "opacity-50 pointer-events-none"}`}>Connect Google Calendar</a>
          <a href="/api/calendar/microsoft/start" className={`btn-secondary ${microsoft ? "" : "opacity-50 pointer-events-none"}`}>Connect Microsoft 365</a>
          {connections.length > 0 && <form action={syncNowAction}><button className="btn-ghost">Sync now</button></form>}
        </div>
        {(!google || !microsoft) && (
          <p className="text-xs text-slate-500">
            Missing: {[!google && "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET", !microsoft && "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET"].filter(Boolean).join(" and ")}. See README for setup.
          </p>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">When a meeting with a video link shows up</h2>
        <form action={setRecordPolicyAction} className="space-y-2">
          {[
            { v: "auto", t: "Record automatically", d: "The recorder joins every meeting. You can still skip individual ones." },
            { v: "ask", t: "Ask me first", d: "You get a pop-up before each meeting and a list on the dashboard." },
            { v: "off", t: "Off", d: "Only record meetings you add manually." },
          ].map((o) => (
            <label key={o.v} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/40 font-normal">
              <input type="radio" name="policy" value={o.v} defaultChecked={org.autoRecordPolicy === o.v} className="!w-auto mt-1" />
              <span><span className="font-medium text-slate-900 block">{o.t}</span><span className="text-sm text-slate-500">{o.d}</span></span>
            </label>
          ))}
          {membership.isAdmin ? <button className="btn-primary">Save</button> : <p className="text-xs text-slate-500">Only admins can change this policy.</p>}
        </form>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Upcoming meetings ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing with a video link in the next 7 days.</p>
        ) : (
          <UpcomingList events={events.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt.toISOString(), platform: PLATFORM_LABEL[e.platform], decision: e.decision, meeting: e.meeting, when: fmtDateTime(e.startAt) }))} />
        )}
      </section>
    </div>
  );
}
