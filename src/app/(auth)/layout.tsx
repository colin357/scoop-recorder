import { Mascot } from "@/components/mascot";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center flex flex-col items-center">
          <Mascot pose="wave" size={88} />
          <div className="text-2xl font-semibold tracking-tight mt-2">Scoop</div>
          <p className="text-sm text-slate-500">Meetings in. Assigned tasks out.</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </main>
  );
}
