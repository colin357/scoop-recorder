/**
 * "Rocky", the mascot: a blue merle Australian Shepherd notetaker with headphones,
 * modeled on the founder's dog. Pure inline SVG (no assets), drawn sitting in a
 * three-quarter view with layered fur, shading and merle mottling.
 * Poses change the paws, eyes, mouth and accessories.
 */
export type MascotPose = "wave" | "listen" | "think" | "celebrate" | "sleep" | "write";

const INK = "#0f172a";
const WHITE = "#fbfaf6";
const CREAM = "#f1ede4";
const COPPER = "#d4894a";
const COPPER_DARK = "#b86f33";
const MERLE = "#a3acbb";
const MERLE_LIGHT = "#c3c9d3";
const MERLE_DARK = "#2b3340";
const BLACK = "#161b25";

/** Irregular merle blotches; deterministic so server and client render the same. */
const SPOTS: [number, number, number, number, number][] = [
  // cx, cy, rx, ry, rotate
  [64, 152, 9, 6, -20], [52, 168, 6, 4, 15], [74, 176, 7, 4, 40], [142, 156, 8, 6, 25], [150, 172, 6, 4, -30],
  [134, 178, 6, 3, 10], [58, 138, 5, 3, 0], [146, 140, 5, 4, -15], [70, 118, 6, 4, 30], [130, 120, 7, 4, -25],
  [46, 74, 6, 4, 20], [56, 60, 5, 3, -30], [150, 70, 6, 4, -20], [142, 56, 5, 3, 25], [62, 90, 4, 3, 0], [138, 92, 4, 3, 0],
];
const SPECKLES: [number, number][] = [
  [60, 160], [68, 144], [80, 170], [136, 164], [152, 160], [140, 130], [66, 130], [50, 156], [156, 150], [128, 174],
  [44, 66], [52, 82], [156, 64], [148, 82], [64, 70], [138, 76],
];

export function Mascot({ pose = "wave", size = 96, className = "" }: { pose?: MascotPose; size?: number; className?: string }) {
  const eyesClosed = pose === "sleep";
  const leftPawUp = pose === "wave" || pose === "celebrate";
  const rightPawUp = pose === "celebrate";
  const mouthOpen = pose !== "think" && pose !== "sleep";

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
        <radialGradient id="rkMerle" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={MERLE_LIGHT} />
          <stop offset="1" stopColor={MERLE} />
        </radialGradient>
        <linearGradient id="rkWhite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WHITE} />
          <stop offset="1" stopColor={CREAM} />
        </linearGradient>
        <linearGradient id="rkCopper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3a067" />
          <stop offset="1" stopColor={COPPER_DARK} />
        </linearGradient>
        <radialGradient id="rkBlue" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="0.6" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0369a1" />
        </radialGradient>
        <radialGradient id="rkAmber" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="0.6" stopColor="#d97706" />
          <stop offset="1" stopColor="#78350f" />
        </radialGradient>
        <linearGradient id="rkTongue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb7fb0" />
          <stop offset="1" stopColor="#e0447f" />
        </linearGradient>
        <linearGradient id="rkPhones" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor={INK} />
        </linearGradient>
        <clipPath id="rkHeadClip"><path d="M58 70 Q58 32 100 32 Q142 32 142 70 Q146 98 124 108 Q100 116 76 108 Q54 98 58 70 Z" /></clipPath>
        <clipPath id="rkBodyClip"><path d="M44 150 Q40 108 100 104 Q160 108 156 150 Q160 186 132 190 L68 190 Q40 186 44 150 Z" /></clipPath>
      </defs>

      {/* ---------- haunches & body ---------- */}
      <ellipse cx="100" cy="164" rx="60" ry="30" fill="url(#rkMerle)" />
      <path d="M44 150 Q40 108 100 104 Q160 108 156 150 Q160 186 132 190 L68 190 Q40 186 44 150 Z" fill="url(#rkMerle)" />
      <g clipPath="url(#rkBodyClip)">
        {SPOTS.filter(([, cy]) => cy > 110).map(([cx, cy, rx, ry, r], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={MERLE_DARK} transform={`rotate(${r} ${cx} ${cy})`} />
        ))}
        {SPECKLES.filter(([, cy]) => cy > 110).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.6" fill={BLACK} opacity="0.7" />
        ))}
        {/* chest ruff: white with tufted edge */}
        <path d="M74 112 Q100 100 126 112 L122 140 Q118 146 122 154 Q116 150 116 160 Q110 154 108 166 Q104 158 100 170 Q96 158 92 166 Q90 154 84 160 Q84 150 78 154 Q82 146 78 140 Z" fill="url(#rkWhite)" />
        <path d="M86 120 Q100 128 114 120" stroke={CREAM} strokeWidth="2" fill="none" opacity="0.9" />
      </g>

      {/* ---------- front legs ---------- */}
      {/* left (viewer's left) */}
      <g className="mascot-arm-left" style={{ transformOrigin: "80px 138px" }}>
        {leftPawUp ? (
          <>
            <path d="M80 138 Q56 122 52 96" stroke="url(#rkCopper)" strokeWidth="15" strokeLinecap="round" fill="none" />
            <path d="M62 112 Q54 104 52 96" stroke={WHITE} strokeWidth="15" strokeLinecap="round" fill="none" />
            <ellipse cx="51" cy="92" rx="9" ry="7" fill={WHITE} />
            <g fill={CREAM}><circle cx="46" cy="90" r="1.8" /><circle cx="51" cy="87" r="1.8" /><circle cx="56" cy="90" r="1.8" /></g>
          </>
        ) : (
          <>
            <path d="M80 138 L78 184" stroke="url(#rkCopper)" strokeWidth="15" strokeLinecap="round" />
            <path d="M78 160 L78 184" stroke={WHITE} strokeWidth="15" strokeLinecap="round" />
            <ellipse cx="78" cy="188" rx="11" ry="6" fill={WHITE} />
            <g fill={CREAM}><circle cx="72" cy="189" r="1.6" /><circle cx="78" cy="191" r="1.6" /><circle cx="84" cy="189" r="1.6" /></g>
          </>
        )}
      </g>
      {/* right (viewer's right) */}
      <g style={{ transformOrigin: "120px 138px" }}>
        {rightPawUp ? (
          <>
            <path d="M120 138 Q144 122 148 96" stroke="url(#rkCopper)" strokeWidth="15" strokeLinecap="round" fill="none" />
            <path d="M138 112 Q146 104 148 96" stroke={WHITE} strokeWidth="15" strokeLinecap="round" fill="none" />
            <ellipse cx="149" cy="92" rx="9" ry="7" fill={WHITE} />
          </>
        ) : pose === "write" ? (
          <>
            <path d="M120 138 Q146 140 154 118" stroke="url(#rkCopper)" strokeWidth="15" strokeLinecap="round" fill="none" />
            <path d="M148 128 Q152 122 154 118" stroke={WHITE} strokeWidth="15" strokeLinecap="round" fill="none" />
            <ellipse cx="156" cy="114" rx="9" ry="7" fill={WHITE} />
            <path d="M160 108 L186 74" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
            <path d="M186 74 L191 67" stroke={INK} strokeWidth="6" strokeLinecap="round" />
            <path d="M160 108 L156 116" stroke="#fde68a" strokeWidth="6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M120 138 L122 184" stroke="url(#rkCopper)" strokeWidth="15" strokeLinecap="round" />
            <path d="M122 160 L122 184" stroke={WHITE} strokeWidth="15" strokeLinecap="round" />
            <ellipse cx="122" cy="188" rx="11" ry="6" fill={WHITE} />
            <g fill={CREAM}><circle cx="116" cy="189" r="1.6" /><circle cx="122" cy="191" r="1.6" /><circle cx="128" cy="189" r="1.6" /></g>
          </>
        )}
      </g>

      {/* ---------- ears (behind head) ---------- */}
      <path d="M70 48 Q44 46 36 78 Q34 96 48 100 Q64 98 72 76 Z" fill={BLACK} />
      <path d="M66 54 Q50 56 44 78 Q44 90 52 92 Q62 88 66 70 Z" fill="url(#rkCopper)" opacity="0.9" />
      <path d="M40 84 q-2 6 2 8 M46 94 q-4 3 -2 7" stroke={BLACK} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M130 48 Q156 46 164 78 Q166 96 152 100 Q136 98 128 76 Z" fill={BLACK} />
      <path d="M134 54 Q150 56 156 78 Q156 90 148 92 Q138 88 134 70 Z" fill="url(#rkCopper)" opacity="0.9" />
      <path d="M160 84 q2 6 -2 8 M154 94 q4 3 2 7" stroke={BLACK} strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* ---------- head ---------- */}
      <path d="M58 70 Q58 32 100 32 Q142 32 142 70 Q146 98 124 108 Q100 116 76 108 Q54 98 58 70 Z" fill="url(#rkMerle)" />
      <g clipPath="url(#rkHeadClip)">
        {/* copper cheeks fading to white muzzle */}
        <ellipse cx="72" cy="88" rx="22" ry="20" fill="url(#rkCopper)" />
        <ellipse cx="128" cy="88" rx="22" ry="20" fill="url(#rkCopper)" />
        {/* merle mottling on the crown and sides */}
        {SPOTS.filter(([, cy]) => cy <= 110).map(([cx, cy, rx, ry, r], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={MERLE_DARK} transform={`rotate(${r} ${cx} ${cy})`} />
        ))}
        {SPECKLES.filter(([, cy]) => cy <= 110).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.5" fill={BLACK} opacity="0.7" />
        ))}
        <path d="M84 40 Q100 46 116 40 Q112 34 100 34 Q88 34 84 40 Z" fill={MERLE_DARK} opacity="0.6" />
        {/* copper eyebrows */}
        <ellipse cx="78" cy="66" rx="7" ry="4.5" fill="url(#rkCopper)" />
        <ellipse cx="122" cy="66" rx="7" ry="4.5" fill="url(#rkCopper)" />
        {/* white blaze: forehead to muzzle, widening over the nose */}
        <path d="M92 32 L108 32 L106 62 Q112 78 104 92 Q100 94 96 92 Q88 78 94 62 Z" fill="url(#rkWhite)" />
        {/* muzzle */}
        <path d="M76 92 Q100 82 124 92 Q128 108 100 116 Q72 108 76 92 Z" fill="url(#rkWhite)" />
        <path d="M84 104 Q100 112 116 104" stroke={CREAM} strokeWidth="1.5" fill="none" />
        {/* fur tufts along the cheek edge */}
        <path d="M60 92 q4 -3 4 3 q3 -4 5 1 M136 92 q-4 -3 -4 3 q-3 -4 -5 1" stroke={COPPER_DARK} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* ---------- eyes ---------- */}
      {eyesClosed ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M74 74 q8 6 16 0" />
          <path d="M110 74 q8 6 16 0" />
          <path d="M72 70 q3 -3 6 -2 M128 70 q-3 -3 -6 -2" strokeWidth="2" />
        </g>
      ) : (
        <g>
          {/* almond eye whites with lid line */}
          <path d="M72 74 Q82 64 92 74 Q82 82 72 74 Z" fill="white" />
          <path d="M108 74 Q118 64 128 74 Q118 82 108 74 Z" fill="white" />
          <circle cx="82.5" cy="74" r="6" fill="url(#rkBlue)" />
          <circle cx="117.5" cy="74" r="6" fill="url(#rkAmber)" />
          <circle cx="82.5" cy="74.5" r="3" fill={INK} />
          <circle cx="117.5" cy="74.5" r="3" fill={INK} />
          <circle cx="84.6" cy="71.6" r="1.7" fill="white" />
          <circle cx="119.6" cy="71.6" r="1.7" fill="white" />
          <path d="M72 74 Q82 64 92 74" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M108 74 Q118 64 128 74" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}

      {/* ---------- nose & mouth ---------- */}
      <path d="M92 90 Q100 86 108 90 Q108 98 100 100 Q92 98 92 90 Z" fill={INK} />
      <ellipse cx="96.5" cy="90" rx="2.2" ry="1.3" fill="white" opacity="0.5" />
      <path d="M96 95 q1 2 2 0 M102 95 q1 2 2 0" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M100 100 L100 104" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {mouthOpen ? (
        <>
          <path d="M82 102 Q100 122 118 102 Q100 110 82 102 Z" fill={INK} />
          <path d="M92 106 L91 122 Q100 134 109 122 L108 106 Q100 111 92 106 Z" fill="url(#rkTongue)" />
          <path d="M100 112 L100 128" stroke="#c2185b" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <path d="M84 102 Q100 112 116 102" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M88 105 l2 3 M112 105 l-2 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : pose === "sleep" ? (
        <path d="M88 106 Q100 112 112 106" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M90 108 Q100 104 110 108" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      {/* whisker dots */}
      <g fill={INK} opacity="0.35">
        <circle cx="86" cy="98" r="1" /><circle cx="82" cy="102" r="1" /><circle cx="114" cy="98" r="1" /><circle cx="118" cy="102" r="1" />
      </g>

      {/* ---------- headphones ---------- */}
      <path d="M54 76 Q54 30 100 30 Q146 30 146 76" stroke="url(#rkPhones)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M84 34 Q100 30 116 34" stroke="#64748b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="44" y="66" width="16" height="26" rx="7" fill="url(#rkPhones)" />
      <rect x="47" y="70" width="10" height="18" rx="5" fill="#475569" />
      <rect x="140" y="66" width="16" height="26" rx="7" fill="url(#rkPhones)" />
      <rect x="143" y="70" width="10" height="18" rx="5" fill="#475569" />
      {pose === "listen" && (
        <g className="mascot-waves" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M34 70 q-6 9 0 18" />
          <path d="M24 64 q-11 15 0 30" />
          <path d="M166 70 q6 9 0 18" />
          <path d="M176 64 q11 15 0 30" />
        </g>
      )}

      {/* ---------- accessories ---------- */}
      {pose === "think" && (
        <g fill="white" stroke="#c7d2fe" strokeWidth="2">
          <circle cx="152" cy="42" r="4" />
          <circle cx="163" cy="30" r="6" />
          <ellipse cx="178" cy="16" rx="14" ry="10" />
          <g fill="#6366f1" stroke="none" className="mascot-dots">
            <circle cx="171" cy="16" r="2" /><circle cx="178" cy="16" r="2" /><circle cx="185" cy="16" r="2" />
          </g>
        </g>
      )}
      {pose === "sleep" && (
        <g fill="#6366f1" fontFamily="system-ui" fontWeight="700">
          <text x="150" y="44" fontSize="16">z</text>
          <text x="162" y="28" fontSize="22">z</text>
        </g>
      )}
      {pose === "celebrate" && (
        <g className="mascot-confetti">
          <rect x="20" y="30" width="8" height="8" rx="2" fill="#f59e0b" transform="rotate(20 24 34)" />
          <rect x="170" y="26" width="8" height="8" rx="2" fill="#ec4899" transform="rotate(-25 174 30)" />
          <circle cx="34" cy="54" r="4" fill="#10b981" />
          <circle cx="168" cy="56" r="4" fill="#0ea5e9" />
          <rect x="97" y="10" width="7" height="7" rx="1.5" fill="#6366f1" transform="rotate(45 100 13)" />
          <circle cx="60" cy="22" r="3" fill="#f43f5e" />
          <circle cx="140" cy="18" r="3" fill="#a855f7" />
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
