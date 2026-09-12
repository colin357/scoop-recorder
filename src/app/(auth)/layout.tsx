export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold tracking-tight">Scoop</div>
          <p className="text-sm text-slate-500">Meetings in. Assigned tasks out.</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </main>
  );
}
