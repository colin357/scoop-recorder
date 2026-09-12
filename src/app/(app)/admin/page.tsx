import { notFound } from "next/navigation";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { fmtRelative } from "@/lib/utils";
import { setCompedAction } from "@/app/actions/billing";

/** Operator dashboard across all organizations. Restricted to SUPERADMIN_EMAILS. */
export default async function AdminPage() {
  const { user } = await requireOrg();
  const allowed = (process.env.SUPERADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) notFound();

  const since30 = subDays(new Date(), 30);
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
                  <div>{o.billingStatus}{o.billingInterval ? ` · ${o.billingInterval === "year" ? "annual" : "monthly"}` : ""} · {o.seats} seat{o.seats === 1 ? "" : "s"}</div>
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
