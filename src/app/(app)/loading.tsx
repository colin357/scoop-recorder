export default function Loading() {
  return (
    <div className="space-y-6 animate-in" aria-busy="true" aria-label="Loading">
      <div className="flex items-end justify-between">
        <div className="space-y-2"><div className="skeleton h-7 w-48" /><div className="skeleton h-4 w-72" /></div>
        <div className="skeleton h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="card p-4 flex items-center gap-4"><div className="skeleton h-11 w-11 !rounded-xl" /><div className="space-y-2"><div className="skeleton h-3 w-20" /><div className="skeleton h-7 w-10" /></div></div>)}</div>
      <div className="card divide-y divide-line/60">{[0, 1, 2, 3].map((i) => <div key={i} className="p-4 flex items-center gap-4"><div className="skeleton h-9 w-9 !rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/2" /><div className="skeleton h-3 w-1/3" /></div><div className="skeleton h-5 w-16 !rounded-full" /></div>)}</div>
    </div>
  );
}
