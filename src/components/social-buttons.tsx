export default function SocialButtons({ google, microsoft, next }: { google: boolean; microsoft: boolean; next?: string }) {
  if (!google && !microsoft) return null;
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-slate-400"><span className="flex-1 h-px bg-slate-200" />or<span className="flex-1 h-px bg-slate-200" /></div>
      {google && <a href={`/api/auth/google/start${q}`} className="btn-secondary w-full">Continue with Google</a>}
      {microsoft && <a href={`/api/auth/microsoft/start${q}`} className="btn-secondary w-full">Continue with Microsoft</a>}
    </div>
  );
}
