import Link from "next/link";
import { Mascot } from "@/components/mascot";

export default function RootNotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="card p-10 text-center max-w-md flex flex-col items-center">
        <Mascot pose="think" size={96} />
        <h1 className="font-display font-semibold text-xl mt-4">Rocky sniffed around and couldn&apos;t find that.</h1>
        <p className="text-sm text-muted mt-1">The page may have moved, or the link is wrong.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className="btn-primary">Open Scoop</Link>
          <Link href="/" className="btn-secondary">Home page</Link>
        </div>
      </div>
    </main>
  );
}
