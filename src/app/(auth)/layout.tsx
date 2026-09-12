import { Mascot } from "@/components/mascot";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center flex flex-col items-center">
          <Mascot pose="wave" size={88} />
          <div className="text-3xl font-display font-bold tracking-tight mt-2">scoop</div>
          <p className="text-sm text-muted">Meetings in. Assigned tasks out.</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </main>
  );
}
