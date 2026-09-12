import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/utils";

export default async function AuditPage({ searchParams }: PageProps<"/settings/audit">) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const { org } = await requireAdmin();
  const take = 50;
  const [rows, total] = await Promise.all([
    db.activityLog.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { actor: true } }),
    db.activityLog.count({ where: { orgId: org.id } }),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-slate-500">Every change in {org.name}: who did what, and when. Admins only.</p>
        </div>
        <a href="/api/export" className="btn-secondary">Export all data (JSON)</a>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500 border-b border-slate-200"><tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">What</th><th className="p-3">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3 whitespace-nowrap text-slate-500">{fmtDateTime(r.createdAt)}</td>
                <td className="p-3 whitespace-nowrap">{r.actor?.name ?? "System"}</td>
                <td className="p-3">{r.summary}</td>
                <td className="p-3 font-mono text-xs text-slate-400">{r.action}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={4}>No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm text-slate-500">
        <span>{total} entries</span>
        <span className="flex gap-3">
          {page > 1 && <a href={`/settings/audit?page=${page - 1}`} className="text-indigo-600">← Newer</a>}
          {page * take < total && <a href={`/settings/audit?page=${page + 1}`} className="text-indigo-600">Older →</a>}
        </span>
      </div>
    </div>
  );
}
