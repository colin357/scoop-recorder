import Link from "next/link";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtDateTime } from "@/lib/utils";
import { formatPhone } from "@/lib/phone-format";
import { scoopNumber, twilioConfigured } from "@/lib/twilio";
import { Empty, PageHeader, ProjectChip, StatusBadge } from "@/components/ui";
import MeetingThumb from "@/components/meeting-thumb";
import { Icon } from "@/components/icons";
import PhoneCallForm from "./phone-call-form";
import { activeProjectsByRecency } from "@/lib/projects";
import { PRICING, fmtUsd, phoneAccess } from "@/lib/billing";
import { setPhoneAddonAction } from "@/app/actions/billing";
import { Mascot } from "@/components/mascot";

/** Phone calls: place a "Call with Rocky" call, see how to merge Rocky in, and browse past calls. */
export default async function CallsPage() {
  const { org, user, membership } = await requireOrg();
  const ready = twilioConfigured();
  const access = phoneAccess(org);
  const [calls, projects] = await Promise.all([
    db.meeting.findMany({
      where: { orgId: org.id, platform: "phone" },
      orderBy: [{ startedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      include: { project: true, attendees: { orderBy: { id: "asc" } }, _count: { select: { tasks: true } } },
    }),
    activeProjectsByRecency(org.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Calls" count={calls.length || undefined} />

      {ready && !access.ok ? (
        access.upsell ? (
          <section className="card overflow-hidden grid lg:grid-cols-[1.1fr_1fr]">
            <div className="p-6 md:p-10">
              <Mascot pose="listen" size={64} />
              <h2 className="text-2xl font-semibold tracking-tight mt-4">Record your phone calls</h2>
              <p className="text-ink-soft mt-2 max-w-md">Rocky joins the call, then writes the summary and hands out the tasks, just like your meetings.</p>
              <ul className="mt-5 space-y-2 text-sm">
                {["Rocky rings you, then dials the other person", "Or merge Rocky into a call you're already on", `${PRICING.phoneIncludedHours} hours of calls a month included`].map((t) => (
                  <li key={t} className="flex gap-2.5"><Icon name="check" size={16} className="text-grass mt-0.5 shrink-0" />{t}</li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
                {membership.isAdmin ? (
                  org.stripeSubscriptionId
                    ? <form action={setPhoneAddonAction.bind(null, true)}><button className="btn-accent">Turn on phone calls</button></form>
                    : <Link href="/settings/billing" className="btn-accent">Go to billing</Link>
                ) : <span className="text-sm text-muted">Ask an admin to turn this on.</span>}
                <span className="text-sm text-muted">{fmtUsd(PRICING.phoneMonthly)}/month for the whole workspace</span>
              </div>
              <p className="text-xs text-muted mt-3">{fmtUsd(PRICING.phoneOveragePerHour)} per extra hour. Turn it off anytime.</p>
            </div>

            {/* What a recorded call turns into */}
            <div className="hidden lg:flex items-center justify-center bg-paper-2 p-10" aria-hidden>
              <div className="w-full max-w-sm rounded-2xl bg-paper border edge shadow-soft p-5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-sky text-merle flex items-center justify-center"><Icon name="phone" size={16} /></span>
                  <div><div className="font-semibold">Call with Jess Park</div><div className="text-xs text-muted">14 min · just now</div></div>
                </div>
                <p className="text-ink-soft mt-4 leading-relaxed">Jess wants to see the waterfront listing Saturday and needs the HOA docs before making an offer.</p>
                <div className="mt-4 space-y-2">
                  {[["Send HOA documents to Jess", "Today", "bg-clay-soft"], ["Book Saturday showing", "Fri", "bg-butter"]].map(([t, d, tone]) => (
                    <div key={t} className="flex items-center gap-2.5 rounded-xl border edge px-3 py-2">
                      <Icon name="check" size={14} className="text-muted" />
                      <span className="flex-1 truncate">{t}</span>
                      <span className={`badge text-ink ${tone}`}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <Empty title="Recording is paused." pose="listen">{access.reason}</Empty>
        )
      ) : ready ? (
        <div className="max-w-xl">
          <PhoneCallForm myPhone={user.phoneVerifiedAt ? user.phone : null} rockyNumber={scoopNumber()} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
          {org.billingStatus === "trialing" && !org.phoneAddonItemId && <p className="text-xs text-muted mt-2">Phone calls are included in your free trial. After that they&apos;re an add-on: {fmtUsd(PRICING.phoneMonthly)}/month with {PRICING.phoneIncludedHours} hours of calls.</p>}
        </div>
      ) : (
        <Empty title="Phone calls aren't switched on yet." pose="listen">
          {membership.isAdmin ? "Add the Twilio and Deepgram keys to the app's environment to turn them on. The steps are in docs/phone-calls.md." : "Ask an admin to turn on phone calls for your workspace."}
        </Empty>
      )}

      {(calls.length > 0 || (ready && access.ok)) && <section>
        <h2 className="font-semibold mb-3">Recent calls</h2>
        {calls.length === 0 ? (
          <p className="text-sm text-muted">No calls recorded yet.</p>
        ) : (
          <ul className="card divide-y divide-line/60 overflow-hidden">
            {calls.map((c) => {
              const other = c.attendees[1]?.name ?? (c.phoneContact ? formatPhone(c.phoneContact) : null);
              return (
                <li key={c.id}>
                  <Link href={`/meetings/${c.id}`} className="p-4 flex items-center gap-4 row-hover">
                    <MeetingThumb id={c.id} thumbnail={null} hasRecording={false} phone className="w-20 sm:w-24" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
                        <span>{c.callKind === "merge" ? "Merged in" : other ? `With ${other}` : "Call with Rocky"}</span>
                        <span className="whitespace-nowrap">{fmtDateTime(c.startedAt ?? c.scheduledAt ?? c.createdAt)}</span>
                        {c.durationSec != null && <span>{Math.max(1, Math.round(c.durationSec / 60))} min</span>}
                        <ProjectChip project={c.project} />
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex badge bg-paper-2 text-ink-soft gap-1"><Icon name="check" size={12} />{c._count.tasks} task{c._count.tasks === 1 ? "" : "s"}</span>
                    <StatusBadge status={c.status} />
                    <Icon name="chevron" size={16} className="-rotate-90 text-muted hidden sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>}
    </div>
  );
}
