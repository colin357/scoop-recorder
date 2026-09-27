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
      <PageHeader title="Calls" count={calls.length} />

      {ready && !access.ok ? (
        <section className="card p-5 max-w-xl flex items-start gap-4">
          <Mascot pose="listen" size={72} className="shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold">Record your phone calls too</h2>
            <p className="text-sm text-ink-soft mt-1">
              {access.upsell
                ? <>Rocky joins your calls, then writes the summary and tasks just like a meeting. {fmtUsd(PRICING.phoneMonthly)}/month for the workspace, {PRICING.phoneIncludedHours} hours of calls included, {fmtUsd(PRICING.phoneOveragePerHour)} per extra hour.</>
                : access.reason}
            </p>
            {access.upsell && (membership.isAdmin ? (
              org.stripeSubscriptionId
                ? <form action={setPhoneAddonAction.bind(null, true)} className="mt-3"><button className="btn-accent">Turn on phone calls · {fmtUsd(PRICING.phoneMonthly)}/mo</button></form>
                : <Link href="/settings/billing" className="btn-accent mt-3 inline-flex">Go to billing</Link>
            ) : <p className="text-xs text-muted mt-3">Ask an admin to turn on phone calls under Settings → Billing.</p>)}
          </div>
        </section>
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

      <section>
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
      </section>
    </div>
  );
}
