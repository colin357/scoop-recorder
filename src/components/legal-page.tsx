import Link from "next/link";
import { Logo } from "@/components/logo";
import { LEGAL } from "@/lib/legal";

/** Public, print-friendly layout for legal documents. */
export default function LegalPage({ title, effective, intro, children }: { title: string; effective: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="theme-landing flex-1 bg-[#f7f6f3] text-ink">
      <header className="sticky top-0 z-30 bg-[#f7f6f3]/85 backdrop-blur border-b edge">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={40} />
          <nav className="flex items-center gap-5 text-sm font-medium text-ink-soft">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
          </nav>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-14">
        <div className="eyebrow">Legal</div>
        <h1 className="font-display font-bold tracking-[-0.02em] text-4xl mt-2">{title}</h1>
        <p className="text-sm text-muted mt-2">Effective {effective}</p>
        <p className="text-ink-soft mt-6 text-lg leading-relaxed">{intro}</p>
        <div className="legal mt-10 space-y-8 text-[15px] leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mt-2 [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-4 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mt-3 [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_a]:text-merle [&_a]:underline [&_strong]:text-ink [&_table]:w-full [&_table]:text-sm [&_table]:mt-3 [&_th]:text-left [&_th]:py-2 [&_th]:font-semibold [&_th]:text-ink [&_td]:py-2 [&_td]:align-top [&_td]:border-t [&_td]:border-line/60">
          {children}
        </div>
        <p className="text-sm text-muted mt-12 border-t edge pt-6">
          Questions? Email <a className="text-merle underline" href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </article>
      <footer className="border-t edge">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span>© {new Date().getFullYear()} {LEGAL.entityName} · scooprecorder.com</span>
          <span className="flex gap-5"><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/terms" className="hover:text-ink">Terms</Link><Link href="/" className="hover:text-ink">Home</Link></span>
        </div>
      </footer>
    </main>
  );
}
