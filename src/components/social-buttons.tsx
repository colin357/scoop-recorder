export default function SocialButtons({ google, microsoft, next }: { google: boolean; microsoft: boolean; next?: string }) {
  if (!google && !microsoft) return null;
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted"><span className="flex-1 h-px bg-line" />or<span className="flex-1 h-px bg-line" /></div>
      {google && <a href={`/api/auth/google/start${q}`} className="btn-secondary w-full">Continue with Google</a>}
      {microsoft && <a href={`/api/auth/microsoft/start${q}`} className="btn-secondary w-full">Continue with Microsoft</a>}
    </div>
  );
}
