import { notFound } from "next/navigation";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtRelative } from "@/lib/utils";
import { setCompedAction } from "@/app/actions/billing";
import { resolveSupportRequestAction } from "@/app/actions/support";

/** Operator dashboard across all organizations. Restricted to SUPERADMIN_EMAILS. */
export default async function AdminPage() {
  const { user } = await requireOrg();
  const allowed = (process.env.SUPERADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) notFound();

  const since30 = subDays(new Date(), 30);
  const support = await db.supportRequest.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 50 });
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, meetings: true, tasks: true, calendarConnections: true } },
      meetings: { select: { createdAt: true, durationSec: true, aiInputTokens: true, aiOutputTokens: true, status: true } },
      activity: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  const inRate = Number(process.env.AI_COST_PER_M_INPUT ?? 0);
  const outRate = Number(process.env.AI_COST_PER_M_OUTPUT ?? 0);
  const rows = orgs.map((o) => {
    const recent = o.meetings.filter((m) => m.createdAt >= since30);
    const tokIn = o.meetings.reduce((a, m) => a + (m.aiInputTokens ?? 0), 0);
    const tokOut = o.meetings.reduce((a, m) => a + (m.aiOutputTokens ?? 0), 0);
    const hours = o.meetings.reduce((a, m) => a + (m.durationSec ?? 0), 0) / 3600;
    return { o, recent: recent.length, tokIn, tokOut, hours, cost: (tokIn / 1e6) * inRate + (tokOut / 1e6) * outRate, failed: o.meetings.filter((m) => m.status === "failed").length, last: o.activity[0]?.createdAt ?? null };
  });
  const totals = rows.reduce((a, r) => ({ orgs: a.orgs + 1, members: a.members + r.o._count.members, meetings: a.meetings + r.o._count.meetings, tasks: a.tasks + r.o._count.tasks, cost: a.cost + r.cost }), { orgs: 0, members: 0, meetings: 0, tasks: 0, cost: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support requests</h1>
        <p className="text-sm text-muted">Filed from the in-app help button. Each one was also emailed to support with the requester as reply-to.</p>
      </div>
      {support.length === 0 ? (
        <div className="card p-4 text-sm text-muted">Nothing filed yet.</div>
      ) : (
        <div className="card divide-y divide-line/60">
          {support.map((r) => (
            <details key={r.id} className={`p-4 ${r.status === "resolved" ? "opacity-60" : ""}`}>
              <summary className="cursor-pointer flex flex-wrap items-center gap-3 text-sm">
                <span className={`badge ${r.status === "open" ? "bg-butter-soft text-copper-deep" : "bg-grass-soft text-grass"}`}>{r.status}</span>
                <span className="badge bg-paper-2 text-ink-soft">{r.category}</span>
                <span className="font-medium flex-1 min-w-40">{r.subject}</span>
                <span className="text-xs text-muted">{r.name} · {r.orgName ?? "no workspace"} · {fmtRelative(r.createdAt)}</span>
              </summary>
              <div className="mt-3 text-sm whitespace-pre-wrap">{r.message}</div>
              <div className="mt-2 text-xs text-muted break-all">{r.email}{r.pageUrl ? ` · ${r.pageUrl}` : ""}{r.userAgent ? ` · ${r.userAgent}` : ""}</div>
              <form action={resolveSupportRequestAction.bind(null, r.id, r.status !== "resolved")} className="mt-2"><button className="text-xs underline text-muted">{r.status === "resolved" ? "Reopen" : "Mark resolved"}</button></form>
            </details>
          ))}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage across organizations</h1>
        <p className="text-sm text-muted">Operator view. AI cost uses AI_COST_PER_M_INPUT / AI_COST_PER_M_OUTPUT (USD per million tokens); token counts are exact.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        {[["Organizations", totals.orgs], ["Members", totals.members], ["Meetings", totals.meetings], ["Tasks", totals.tasks], ["AI cost", `$${totals.cost.toFixed(2)}`]].map(([l, v]) => (
          <div key={String(l)} className="card p-4"><div className="text-xs text-muted">{l}</div><div className="text-2xl font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted border-b border-line">
            <tr><th className="p-3">Organization</th><th className="p-3">Plan</th><th className="p-3">Members</th><th className="p-3">Calendars</th><th className="p-3">Meetings</th><th className="p-3">Last 30d</th><th className="p-3">Failed</th><th className="p-3">Hours</th><th className="p-3">Tasks</th><th className="p-3">Tokens in/out</th><th className="p-3">AI cost</th><th className="p-3">Last activity</th></tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map(({ o, recent, tokIn, tokOut, hours, cost, failed, last }) => (
              <tr key={o.id}>
                <td className="p-3 font-medium">{o.name}<div className="text-xs text-muted">{fmtRelative(o.createdAt)}</div></td>
                <td className="p-3">
                  <div>{o.billingStatus}{o.billingPlan ? ` · ${o.billingPlan}` : ""}{o.billingInterval ? ` · ${o.billingInterval === "year" ? "annual" : "monthly"}` : ""} · {o.seats} seat{o.seats === 1 ? "" : "s"}</div>
                  <form action={setCompedAction.bind(null, o.id, o.billingStatus !== "comped")}><button className="text-xs underline text-muted">{o.billingStatus === "comped" ? "Remove comp" : "Comp"}</button></form>
                </td>
                <td className="p-3">{o._count.members}</td><td className="p-3">{o._count.calendarConnections}</td><td className="p-3">{o._count.meetings}</td><td className="p-3">{recent}</td>
                <td className={`p-3 ${failed ? "text-clay" : ""}`}>{failed}</td><td className="p-3">{hours.toFixed(1)}</td><td className="p-3">{o._count.tasks}</td>
                <td className="p-3 text-muted">{tokIn.toLocaleString()} / {tokOut.toLocaleString()}</td><td className="p-3">${cost.toFixed(2)}</td>
                <td className="p-3 text-muted">{last ? fmtRelative(last) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
