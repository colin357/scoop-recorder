/**
 * "Rocky", the mascot: a blue merle Australian Shepherd notetaker with headphones.
 * Modeled on the founder's dog. Pure inline SVG so it works everywhere without assets.
 * Poses change the paws, eyes and accessories.
 */
export type MascotPose = "wave" | "listen" | "think" | "celebrate" | "sleep" | "write";

const MERLE = "#9aa5b8";
const MERLE_DARK = "#1f2937";
const COPPER = "#d98f4a";
const WHITE = "#fbfaf7";
const INK = "#111827";

export function Mascot({ pose = "wave", size = 96, className = "" }: { pose?: MascotPose; size?: number; className?: string }) {
  const eyesClosed = pose === "sleep";
  const leftPawUp = pose === "wave" || pose === "celebrate";
  const rightPawUp = pose === "celebrate";
  const mouthOpen = pose !== "think" && pose !== "sleep";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`mascot mascot-${pose} ${className}`}
      role="img"
      aria-label={`Rocky the Aussie mascot, ${pose}`}
    >
      <defs>
        <clipPath id="rockyHead"><ellipse cx="60" cy="56" rx="30" ry="27" /></clipPath>
        <clipPath id="rockyBody"><path d="M30 80 Q30 66 60 66 Q90 66 90 80 L90 106 Q90 114 82 114 L38 114 Q30 114 30 106 Z" /></clipPath>
      </defs>

      {/* body */}
      <path d="M30 80 Q30 66 60 66 Q90 66 90 80 L90 106 Q90 114 82 114 L38 114 Q30 114 30 106 Z" fill={MERLE} />
      <g clipPath="url(#rockyBody)">
        <ellipse cx="60" cy="96" rx="15" ry="22" fill={WHITE} />
        <ellipse cx="37" cy="84" rx="5" ry="7" fill={MERLE_DARK} />
        <ellipse cx="84" cy="92" rx="4" ry="6" fill={MERLE_DARK} />
        <ellipse cx="40" cy="104" rx="3" ry="4" fill={MERLE_DARK} />
        <ellipse cx="82" cy="108" rx="4" ry="3" fill={MERLE_DARK} />
      </g>

      {/* paws / arms */}
      <g className="mascot-arm-left" style={{ transformOrigin: "36px 88px" }}>
        {leftPawUp ? (
          <>
            <path d="M36 88 Q22 78 24 62" stroke={MERLE} strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="24" cy="60" r="6" fill={WHITE} />
          </>
        ) : (
          <>
            <path d="M36 88 Q28 98 30 110" stroke={MERLE} strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="30" cy="111" r="6" fill={WHITE} />
          </>
        )}
      </g>
      <g style={{ transformOrigin: "84px 88px" }}>
        {rightPawUp ? (
          <>
            <path d="M84 88 Q98 78 96 62" stroke={MERLE} strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="96" cy="60" r="6" fill={WHITE} />
          </>
        ) : pose === "write" ? (
          <>
            <path d="M84 88 Q98 92 102 80" stroke={MERLE} strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="102" cy="78" r="6" fill={WHITE} />
            <path d="M104 74 L116 56" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            <path d="M116 56 L119 51" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M84 88 Q92 98 90 110" stroke={MERLE} strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="90" cy="111" r="6" fill={WHITE} />
          </>
        )}
      </g>

      {/* ears: folded, drooping to the sides */}
      <path d="M40 34 Q26 36 20 56 Q20 68 30 68 Q40 66 44 50 Z" fill={MERLE_DARK} />
      <path d="M38 40 Q30 42 27 56 Q28 62 33 62 Q38 58 40 48 Z" fill={COPPER} opacity="0.8" />
      <ellipse cx="26" cy="46" rx="2.5" ry="2" fill={MERLE} opacity="0.7" />
      <path d="M80 34 Q94 36 100 56 Q100 68 90 68 Q80 66 76 50 Z" fill={MERLE_DARK} />
      <path d="M82 40 Q90 42 93 56 Q92 62 87 62 Q82 58 80 48 Z" fill={COPPER} opacity="0.8" />
      <ellipse cx="94" cy="46" rx="2.5" ry="2" fill={MERLE} opacity="0.7" />

      {/* head */}
      <ellipse cx="60" cy="56" rx="30" ry="27" fill={MERLE} />
      <g clipPath="url(#rockyHead)">
        {/* copper cheeks */}
        <ellipse cx="40" cy="62" rx="12" ry="11" fill={COPPER} />
        <ellipse cx="80" cy="62" rx="12" ry="11" fill={COPPER} />
        {/* merle patches + dark spots */}
        <ellipse cx="38" cy="42" rx="11" ry="9" fill={MERLE} />
        <ellipse cx="82" cy="42" rx="11" ry="9" fill={MERLE} />
        <ellipse cx="34" cy="40" rx="4" ry="3" fill={MERLE_DARK} />
        <ellipse cx="44" cy="46" rx="3" ry="2.5" fill={MERLE_DARK} />
        <ellipse cx="86" cy="39" rx="4" ry="3" fill={MERLE_DARK} />
        <ellipse cx="77" cy="47" rx="3" ry="2.5" fill={MERLE_DARK} />
        {/* white blaze + muzzle */}
        <path d="M52 28 L68 28 L65 58 Q60 60 55 58 Z" fill={WHITE} />
        <ellipse cx="60" cy="67" rx="17" ry="13" fill={WHITE} />
        {/* copper eyebrow dots */}
        <ellipse cx="47" cy="44" rx="3.5" ry="2.5" fill={COPPER} />
        <ellipse cx="73" cy="44" rx="3.5" ry="2.5" fill={COPPER} />
      </g>

      {/* eyes: one blue, one amber, like Rocky */}
      {eyesClosed ? (
        <g stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M45 53 q4 3 8 0" />
          <path d="M67 53 q4 3 8 0" />
        </g>
      ) : (
        <g>
          <ellipse cx="49" cy="53" rx="4.5" ry="4.8" fill="white" />
          <ellipse cx="71" cy="53" rx="4.5" ry="4.8" fill="white" />
          <circle cx="49.5" cy="53.5" r="3.2" fill="#38bdf8" />
          <circle cx="71.5" cy="53.5" r="3.2" fill="#b45309" />
          <circle cx="49.5" cy="53.5" r="1.6" fill={INK} />
          <circle cx="71.5" cy="53.5" r="1.6" fill={INK} />
          <circle cx="50.6" cy="52.2" r="0.9" fill="white" />
          <circle cx="72.6" cy="52.2" r="0.9" fill="white" />
        </g>
      )}

      {/* nose + mouth + tongue */}
      <ellipse cx="60" cy="62" rx="4.5" ry="3.5" fill={INK} />
      <ellipse cx="58.8" cy="61" rx="1.2" ry="0.7" fill="white" opacity="0.6" />
      {mouthOpen ? (
        <>
          <path d="M48 67 Q60 80 72 67 Q60 71 48 67 Z" fill={INK} />
          <path d="M55 70 L55 80 Q60 88 65 80 L65 70 Q60 73 55 70 Z" fill="#f472b6" />
          <path d="M60 73 L60 84" stroke="#e11d74" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          <path d="M47 66 q13 6 26 0" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      ) : pose === "sleep" ? (
        <path d="M54 69 q6 2 12 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M55 70 q5 -2 10 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      )}

      {/* headphones */}
      <path d="M31 50 Q31 24 60 24 Q89 24 89 50" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="26" y="46" width="9" height="14" rx="4" fill={INK} />
      <rect x="85" y="46" width="9" height="14" rx="4" fill={INK} />
      {pose === "listen" && (
        <g className="mascot-waves" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M18 48 q-5 6 0 12" />
          <path d="M12 44 q-8 10 0 20" />
          <path d="M102 48 q5 6 0 12" />
          <path d="M108 44 q8 10 0 20" />
        </g>
      )}

      {/* accessories */}
      {pose === "think" && (
        <g fill="white" stroke="#c7d2fe" strokeWidth="1.5">
          <circle cx="92" cy="30" r="3" />
          <circle cx="100" cy="22" r="4.5" />
          <ellipse cx="108" cy="12" rx="9" ry="7" />
          <g fill="#6366f1" stroke="none" className="mascot-dots">
            <circle cx="103" cy="12" r="1.5" />
            <circle cx="108" cy="12" r="1.5" />
            <circle cx="113" cy="12" r="1.5" />
          </g>
        </g>
      )}
      {pose === "sleep" && (
        <g fill="#6366f1" fontFamily="system-ui" fontWeight="700">
          <text x="92" y="30" fontSize="12">z</text>
          <text x="100" y="20" fontSize="15">z</text>
        </g>
      )}
      {pose === "celebrate" && (
        <g className="mascot-confetti">
          <rect x="10" y="20" width="5" height="5" rx="1" fill="#f59e0b" transform="rotate(20 12 22)" />
          <rect x="104" y="16" width="5" height="5" rx="1" fill="#ec4899" transform="rotate(-25 106 18)" />
          <circle cx="18" cy="34" r="2.5" fill="#10b981" />
          <circle cx="102" cy="36" r="2.5" fill="#0ea5e9" />
          <rect x="58" y="6" width="4" height="4" rx="1" fill="#6366f1" transform="rotate(45 60 8)" />
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
