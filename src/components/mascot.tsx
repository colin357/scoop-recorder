/**
 * "Rocky", the mascot: a blue merle Australian Shepherd notetaker with headphones,
 * modeled on the founder's dog. Pure inline SVG (no assets), drawn sitting and
 * facing the viewer with layered fur, shading and marbled merle.
 * Poses change the paws, eyes, mouth and accessories.
 */
export type MascotPose = "wave" | "listen" | "think" | "celebrate" | "sleep" | "write";

const INK = "#0f172a";
const WHITE = "#fcfbf8";
const CREAM = "#eee9df";
const COPPER_DARK = "#b5652b";
const MERLE = "#9ba4b3";
const MERLE_DARK = "#2a3140";
const BLACK = "#141922";

// Marbled merle patches (organic blobs) for the body, in 200x200 space.
const BODY_PATCHES = [
  "M48 150 q6 -14 20 -10 q10 4 6 16 q-4 12 -16 10 q-14 -2 -10 -16 Z",
  "M132 140 q12 -10 22 0 q6 10 -4 18 q-12 6 -20 -2 q-6 -8 2 -16 Z",
  "M60 178 q4 -8 14 -6 q8 4 4 12 q-6 6 -14 2 q-6 -3 -4 -8 Z",
  "M138 176 q6 -8 14 -4 q6 6 0 12 q-8 4 -14 0 q-4 -4 0 -8 Z",
  "M70 128 q8 -8 16 -2 q4 6 -2 12 q-8 4 -14 -2 q-4 -4 0 -8 Z",
  "M124 126 q8 -6 14 0 q4 6 -2 12 q-8 4 -14 -2 q-4 -6 2 -10 Z",
];
const HEAD_PATCHES = [
  "M60 62 q4 -16 18 -16 q8 2 6 12 q-4 12 -14 12 q-12 -2 -10 -8 Z",
  "M116 46 q12 -2 20 8 q4 10 -6 14 q-12 2 -16 -6 q-4 -10 2 -16 Z",
  "M64 84 q4 -6 10 -2 q2 6 -4 8 q-8 2 -6 -6 Z",
  "M128 82 q6 -4 10 2 q0 6 -6 6 q-8 0 -4 -8 Z",
];
const SPECKLES: [number, number][] = [
  [56, 136], [78, 148], [92, 176], [110, 178], [124, 160], [150, 160], [66, 166], [146, 186], [58, 186], [86, 132], [116, 134],
  [74, 52], [86, 46], [110, 42], [128, 66], [70, 74], [136, 74], [62, 96], [140, 96],
];

export function Mascot({ pose = "wave", size = 96, className = "" }: { pose?: MascotPose; size?: number; className?: string }) {
  const eyesClosed = pose === "sleep";
  const leftPawUp = pose === "wave" || pose === "celebrate";
  const rightPawUp = pose === "celebrate";
  const mouthOpen = pose !== "think" && pose !== "sleep";

  const HEAD = "M100 34 Q132 34 140 60 Q146 84 134 104 Q120 122 100 122 Q80 122 66 104 Q54 84 60 60 Q68 34 100 34 Z";
  const BODY = "M100 118 Q136 118 148 140 Q160 156 160 178 Q160 194 140 196 L60 196 Q40 194 40 178 Q40 156 52 140 Q64 118 100 118 Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`mascot mascot-${pose} ${className}`}
      role="img"
      aria-label={`Rocky the Aussie mascot, ${pose}`}
    >
      <defs>
        <radialGradient id="rkMerle" cx="0.45" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#c4cad4" />
          <stop offset="1" stopColor={MERLE} />
        </radialGradient>
        <linearGradient id="rkWhite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WHITE} />
          <stop offset="1" stopColor={CREAM} />
        </linearGradient>
        <linearGradient id="rkCopper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6a06a" />
          <stop offset="1" stopColor={COPPER_DARK} />
        </linearGradient>
        <radialGradient id="rkBlue" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#c7ecfd" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#075985" />
        </radialGradient>
        <radialGradient id="rkAmber" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#d97706" />
          <stop offset="1" stopColor="#713f12" />
        </radialGradient>
        <linearGradient id="rkTongue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb86b4" />
          <stop offset="1" stopColor="#dc3f7d" />
        </linearGradient>
        <linearGradient id="rkPhones" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b4657" />
          <stop offset="1" stopColor={INK} />
        </linearGradient>
        <clipPath id="rkHeadClip"><path d={HEAD} /></clipPath>
        <clipPath id="rkBodyClip"><path d={BODY} /></clipPath>
      </defs>

      {/* ================= body ================= */}
      <path d={BODY} fill="url(#rkMerle)" />
      <g clipPath="url(#rkBodyClip)">
        {BODY_PATCHES.map((d, i) => <path key={i} d={d} fill={MERLE_DARK} />)}
        {SPECKLES.filter(([, y]) => y > 110).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill={BLACK} opacity="0.55" />)}
        {/* copper on the shoulders */}
        <path d="M52 146 q6 -18 22 -20 q6 8 -2 20 q-10 10 -20 0 Z" fill="url(#rkCopper)" opacity="0.9" />
        <path d="M148 146 q-6 -18 -22 -20 q-6 8 2 20 q10 10 20 0 Z" fill="url(#rkCopper)" opacity="0.9" />
        {/* white bib with a tufted edge */}
        <path d="M78 118 Q100 112 122 118 L124 150 q-4 4 -2 10 q-6 -2 -6 8 q-6 -4 -8 6 q-4 -6 -8 2 q-2 -8 -8 -4 q-2 -8 -8 -6 q2 -6 -2 -10 Z" fill="url(#rkWhite)" />
        {/* fur strands */}
        <g stroke="#7d8798" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7">
          <path d="M50 170 q3 -6 2 -12" /><path d="M150 170 q-3 -6 -2 -12" /><path d="M58 188 q2 -5 1 -9" /><path d="M142 188 q-2 -5 -1 -9" />
        </g>
        <g stroke="#d9d4c8" strokeWidth="1.2" strokeLinecap="round" fill="none">
          <path d="M92 130 q2 6 0 12" /><path d="M108 130 q-2 6 0 12" /><path d="M100 144 q0 8 0 14" />
        </g>
      </g>

      {/* ================= front legs ================= */}
      <g className="mascot-arm-left" style={{ transformOrigin: "78px 148px" }}>
        {leftPawUp ? (
          <>
            <path d="M78 150 Q60 130 52 104" stroke="url(#rkCopper)" strokeWidth="16" strokeLinecap="round" fill="none" />
            <path d="M58 116 Q54 110 52 104" stroke={WHITE} strokeWidth="16" strokeLinecap="round" fill="none" />
            <ellipse cx="51" cy="100" rx="10" ry="8" fill={WHITE} />
            <g fill={CREAM}><circle cx="45" cy="97" r="2" /><circle cx="51" cy="94" r="2" /><circle cx="57" cy="97" r="2" /></g>
          </>
        ) : (
          <>
            <path d="M78 150 L76 188" stroke="url(#rkCopper)" strokeWidth="16" strokeLinecap="round" />
            <path d="M76 170 L76 188" stroke={WHITE} strokeWidth="16" strokeLinecap="round" />
            <ellipse cx="76" cy="192" rx="12" ry="6.5" fill={WHITE} />
            <g fill={CREAM}><circle cx="69" cy="193" r="1.8" /><circle cx="76" cy="195" r="1.8" /><circle cx="83" cy="193" r="1.8" /></g>
          </>
        )}
      </g>
      <g style={{ transformOrigin: "122px 148px" }}>
        {rightPawUp ? (
          <>
            <path d="M122 150 Q140 130 148 104" stroke="url(#rkCopper)" strokeWidth="16" strokeLinecap="round" fill="none" />
            <path d="M142 116 Q146 110 148 104" stroke={WHITE} strokeWidth="16" strokeLinecap="round" fill="none" />
            <ellipse cx="149" cy="100" rx="10" ry="8" fill={WHITE} />
          </>
        ) : pose === "write" ? (
          <>
            <path d="M122 150 Q146 148 156 126" stroke="url(#rkCopper)" strokeWidth="16" strokeLinecap="round" fill="none" />
            <path d="M152 134 Q154 130 156 126" stroke={WHITE} strokeWidth="16" strokeLinecap="round" fill="none" />
            <ellipse cx="158" cy="122" rx="10" ry="8" fill={WHITE} />
            <path d="M162 116 L188 80" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
            <path d="M188 80 L193 73" stroke={INK} strokeWidth="6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M122 150 L124 188" stroke="url(#rkCopper)" strokeWidth="16" strokeLinecap="round" />
            <path d="M124 170 L124 188" stroke={WHITE} strokeWidth="16" strokeLinecap="round" />
            <ellipse cx="124" cy="192" rx="12" ry="6.5" fill={WHITE} />
            <g fill={CREAM}><circle cx="117" cy="193" r="1.8" /><circle cx="124" cy="195" r="1.8" /><circle cx="131" cy="193" r="1.8" /></g>
          </>
        )}
      </g>

      {/* ================= ears (behind head) ================= */}
      <path d="M72 46 Q46 50 38 84 Q36 104 50 108 Q66 106 72 84 Z" fill={BLACK} />
      <path d="M70 52 Q52 58 46 84 Q46 98 54 100 Q64 96 68 76 Z" fill="url(#rkCopper)" opacity="0.85" />
      <path d="M40 96 q3 4 8 6 q-2 4 2 6" stroke="#3b4657" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M128 46 Q154 50 162 84 Q164 104 150 108 Q134 106 128 84 Z" fill={BLACK} />
      <path d="M130 52 Q148 58 154 84 Q154 98 146 100 Q136 96 132 76 Z" fill="url(#rkCopper)" opacity="0.85" />
      <path d="M160 96 q-3 4 -8 6 q2 4 -2 6" stroke="#3b4657" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />

      {/* ================= head ================= */}
      <path d={HEAD} fill="url(#rkMerle)" />
      <g clipPath="url(#rkHeadClip)">
        {HEAD_PATCHES.map((d, i) => <path key={i} d={d} fill={MERLE_DARK} />)}
        {SPECKLES.filter(([, y]) => y <= 110).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill={BLACK} opacity="0.55" />)}
        {/* copper points: around the eyes and on the cheeks */}
        <path d="M62 76 q8 -8 22 -2 q8 8 4 22 q-6 14 -18 12 q-12 -6 -10 -18 q0 -8 2 -14 Z" fill="url(#rkCopper)" />
        <path d="M138 76 q-8 -8 -22 -2 q-8 8 -4 22 q6 14 18 12 q12 -6 10 -18 q0 -8 -2 -14 Z" fill="url(#rkCopper)" />
        <ellipse cx="78" cy="62" rx="6" ry="4" fill="#e6a06a" />
        <ellipse cx="122" cy="62" rx="6" ry="4" fill="#e6a06a" />
        {/* white blaze: narrow at the forehead, widening into the muzzle */}
        <path d="M95 34 L105 34 Q106 52 104 66 Q116 80 116 96 Q112 118 100 120 Q88 118 84 96 Q84 80 96 66 Q94 52 95 34 Z" fill="url(#rkWhite)" />
        {/* cheek fluff (white) at the jaw */}
        <path d="M66 100 q10 -6 18 4 q-2 12 -12 14 q-8 -6 -6 -18 Z" fill="url(#rkWhite)" opacity="0.95" />
        <path d="M134 100 q-10 -6 -18 4 q2 12 12 14 q8 -6 6 -18 Z" fill="url(#rkWhite)" opacity="0.95" />
        {/* fur texture strokes */}
        <g stroke="#7d8798" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.6">
          <path d="M66 58 q2 -6 6 -8" /><path d="M134 58 q-2 -6 -6 -8" /><path d="M90 40 q2 -3 5 -3" /><path d="M110 40 q-2 -3 -5 -3" />
        </g>
        <g stroke="#d9d4c8" strokeWidth="1.1" strokeLinecap="round" fill="none">
          <path d="M96 74 q1 6 0 10" /><path d="M104 74 q-1 6 0 10" /><path d="M72 112 q3 -3 4 -7" /><path d="M128 112 q-3 -3 -4 -7" />
        </g>
      </g>

      {/* ================= eyes ================= */}
      {eyesClosed ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M72 78 q8 6 16 0" />
          <path d="M112 78 q8 6 16 0" />
        </g>
      ) : (
        <g>
          <path d="M70 78 Q80 66 90 78 Q80 86 70 78 Z" fill="white" />
          <path d="M110 78 Q120 66 130 78 Q120 86 110 78 Z" fill="white" />
          <circle cx="80.5" cy="78" r="6.2" fill="url(#rkBlue)" />
          <circle cx="119.5" cy="78" r="6.2" fill="url(#rkAmber)" />
          <circle cx="80.5" cy="78.5" r="3.1" fill={INK} />
          <circle cx="119.5" cy="78.5" r="3.1" fill={INK} />
          <circle cx="82.8" cy="75.4" r="1.8" fill="white" />
          <circle cx="121.8" cy="75.4" r="1.8" fill="white" />
          <path d="M70 78 Q80 66 90 78" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M110 78 Q120 66 130 78" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      )}

      {/* ================= nose & mouth ================= */}
      <path d="M91 95 Q100 90 109 95 Q110 104 100 106 Q90 104 91 95 Z" fill={INK} />
      <ellipse cx="96" cy="95" rx="2.4" ry="1.4" fill="white" opacity="0.45" />
      <path d="M95 100 q1.5 2.5 3 0 M102 100 q1.5 2.5 3 0" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M100 106 L100 110" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      {mouthOpen ? (
        <>
          <path d="M82 108 Q100 128 118 108 Q100 116 82 108 Z" fill={INK} />
          <path d="M92 112 L91 128 Q100 140 109 128 L108 112 Q100 117 92 112 Z" fill="url(#rkTongue)" />
          <path d="M100 118 L100 134" stroke="#b91c5c" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <path d="M84 108 Q100 118 116 108" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M88 111 l1.5 3 M112 111 l-1.5 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : pose === "sleep" ? (
        <path d="M88 112 Q100 118 112 112" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M90 114 Q100 110 110 114" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      <g fill={INK} opacity="0.3">
        <circle cx="86" cy="102" r="1" /><circle cx="83" cy="106" r="1" /><circle cx="114" cy="102" r="1" /><circle cx="117" cy="106" r="1" />
      </g>

      {/* ================= headphones ================= */}
      <path d="M52 78 Q52 30 100 30 Q148 30 148 78" stroke="url(#rkPhones)" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      <path d="M82 34 Q100 29 118 34" stroke="#64748b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="42" y="66" width="17" height="28" rx="8" fill="url(#rkPhones)" />
      <rect x="45.5" y="70" width="10" height="20" rx="5" fill="#475569" />
      <rect x="141" y="66" width="17" height="28" rx="8" fill="url(#rkPhones)" />
      <rect x="144.5" y="70" width="10" height="20" rx="5" fill="#475569" />
      {pose === "listen" && (
        <g className="mascot-waves" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M32 70 q-6 10 0 20" />
          <path d="M22 64 q-11 16 0 32" />
          <path d="M168 70 q6 10 0 20" />
          <path d="M178 64 q11 16 0 32" />
        </g>
      )}

      {/* ================= accessories ================= */}
      {pose === "think" && (
        <g fill="white" stroke="#c7d2fe" strokeWidth="2">
          <circle cx="152" cy="40" r="4" />
          <circle cx="163" cy="28" r="6" />
          <ellipse cx="178" cy="14" rx="14" ry="10" />
          <g fill="#6366f1" stroke="none" className="mascot-dots">
            <circle cx="171" cy="14" r="2" /><circle cx="178" cy="14" r="2" /><circle cx="185" cy="14" r="2" />
          </g>
        </g>
      )}
      {pose === "sleep" && (
        <g fill="#6366f1" fontFamily="system-ui" fontWeight="700">
          <text x="150" y="42" fontSize="16">z</text>
          <text x="162" y="26" fontSize="22">z</text>
        </g>
      )}
      {pose === "celebrate" && (
        <g className="mascot-confetti">
          <rect x="20" y="30" width="8" height="8" rx="2" fill="#f59e0b" transform="rotate(20 24 34)" />
          <rect x="170" y="26" width="8" height="8" rx="2" fill="#ec4899" transform="rotate(-25 174 30)" />
          <circle cx="34" cy="54" r="4" fill="#10b981" />
          <circle cx="168" cy="56" r="4" fill="#0ea5e9" />
          <rect x="97" y="8" width="7" height="7" rx="1.5" fill="#6366f1" transform="rotate(45 100 11)" />
          <circle cx="60" cy="20" r="3" fill="#f43f5e" />
          <circle cx="140" cy="16" r="3" fill="#a855f7" />
        </g>
      )}
    </svg>
  );
}

/** Decorative background blobs for hero sections and empty states. */
export function Blobs({ className = "" }: { className?: string }) {
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden>
      <circle cx="80" cy="40" r="90" fill="#c7d2fe" opacity="0.5" />
      <circle cx="520" cy="160" r="110" fill="#fde68a" opacity="0.45" />
      <circle cx="380" cy="20" r="50" fill="#f9a8d4" opacity="0.45" />
    </svg>
  );
}
