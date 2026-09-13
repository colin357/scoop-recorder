import { LogoStacked } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center flex flex-col items-center">
          <LogoStacked height={132} />
          <p className="text-sm text-muted mt-3">Meetings in. Assigned tasks out.</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </main>
  );
}
