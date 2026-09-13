import Link from "next/link";

/**
 * Brand marks generated from public/scoop-logo.png (see scripts in git history).
 *  - mark: Rocky's head, square-ish, transparent background
 *  - wordmark: the "Scoop" lettering
 *  - lockup: head above wordmark, as supplied
 */
export const BRAND = {
  mark: "/brand/mark-256.png",
  wordmark: "/brand/wordmark-96.png",
  lockup: "/brand/logo-512.png",
  og: "/og.png",
};

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND.mark} width={size} height={size} alt="Scoop" className={`shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />;
}

export function Wordmark({ height = 18, className = "" }: { height?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND.wordmark} height={height} alt="Scoop" className={`object-contain ${className}`} style={{ height, width: "auto" }} />;
}

/** Horizontal lockup: mark beside wordmark. Use in headers. */
export function Logo({ href = "/", size = 36, className = "", wordmark = true }: { href?: string; size?: number; className?: string; wordmark?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Scoop home">
      <LogoMark size={size} />
      {wordmark && <Wordmark height={Math.round(size * 0.5)} />}
    </Link>
  );
}

/** Vertical lockup as supplied (head over wordmark). Use on auth and onboarding screens. */
export function LogoStacked({ height = 120, className = "" }: { height?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND.lockup} alt="Scoop" className={`object-contain ${className}`} style={{ height, width: "auto" }} />;
}
