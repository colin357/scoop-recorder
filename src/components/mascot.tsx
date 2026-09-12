/**
 * "Scoop", the mascot: a friendly ice-cream-scoop notetaker with headphones.
 * Pure inline SVG so it works everywhere without assets. Poses change the arms,
 * eyes and accessories.
 */
export type MascotPose = "wave" | "listen" | "think" | "celebrate" | "sleep" | "write";

export function Mascot({ pose = "wave", size = 96, className = "" }: { pose?: MascotPose; size?: number; className?: string }) {
  const eyesClosed = pose === "sleep";
  const leftArmUp = pose === "wave" || pose === "celebrate";
  const rightArmUp = pose === "celebrate";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`mascot mascot-${pose} ${className}`}
      role="img"
      aria-label={`Scoop the mascot, ${pose}`}
    >
      <defs>
        <linearGradient id="scoopBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="scoopCone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* cone */}
      <path d="M40 78 L60 116 L80 78 Z" fill="url(#scoopCone)" />
      <path d="M46 84 L74 84 M50 92 L70 92 M54 100 L66 100" stroke="#b45309" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* arms */}
      <g className="mascot-arm-left" style={{ transformOrigin: "34px 66px" }}>
        {leftArmUp ? (
          <path d="M34 66 Q20 50 26 36" stroke="#6366f1" strokeWidth="7" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M34 66 Q22 74 24 84" stroke="#6366f1" strokeWidth="7" strokeLinecap="round" fill="none" />
        )}
      </g>
      <g style={{ transformOrigin: "86px 66px" }}>
        {rightArmUp ? (
          <path d="M86 66 Q100 50 94 36" stroke="#6366f1" strokeWidth="7" strokeLinecap="round" fill="none" />
        ) : pose === "write" ? (
          <>
            <path d="M86 66 Q100 70 104 60" stroke="#6366f1" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M100 60 L112 44" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            <path d="M112 44 L115 40" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <path d="M86 66 Q98 74 96 84" stroke="#6366f1" strokeWidth="7" strokeLinecap="round" fill="none" />
        )}
      </g>

      {/* body (scoop) */}
      <circle cx="60" cy="54" r="32" fill="url(#scoopBody)" />
      <ellipse cx="48" cy="40" rx="8" ry="5" fill="white" opacity="0.35" />
      {/* drips */}
      <path d="M32 62 q0 8 4 8 q4 0 4 -6" fill="#a5b4fc" />
      <path d="M78 66 q0 9 5 9 q4 0 4 -7" fill="#a5b4fc" />

      {/* headphones */}
      <path d="M30 52 Q30 24 60 24 Q90 24 90 52" stroke="#0f172a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="24" y="48" width="10" height="16" rx="4" fill="#0f172a" />
      <rect x="86" y="48" width="10" height="16" rx="4" fill="#0f172a" />
      {pose === "listen" && (
        <g className="mascot-waves" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M12 50 q-5 6 0 12" />
          <path d="M6 46 q-8 10 0 20" />
          <path d="M108 50 q5 6 0 12" />
          <path d="M114 46 q8 10 0 20" />
        </g>
      )}

      {/* face */}
      {eyesClosed ? (
        <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M46 54 q5 4 10 0" />
          <path d="M64 54 q5 4 10 0" />
        </g>
      ) : (
        <g>
          <circle cx="50" cy="54" r="5.5" fill="white" />
          <circle cx="70" cy="54" r="5.5" fill="white" />
          <circle cx="51.5" cy="55" r="3" fill="#0f172a" />
          <circle cx="71.5" cy="55" r="3" fill="#0f172a" />
          <circle cx="52.5" cy="53.5" r="1" fill="white" />
          <circle cx="72.5" cy="53.5" r="1" fill="white" />
        </g>
      )}
      {pose === "celebrate" ? (
        <ellipse cx="60" cy="68" rx="7" ry="5" fill="#0f172a" />
      ) : pose === "think" ? (
        <path d="M54 68 q6 -3 12 0" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M52 66 q8 7 16 0" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      <circle cx="42" cy="63" r="4" fill="#f9a8d4" opacity="0.7" />
      <circle cx="78" cy="63" r="4" fill="#f9a8d4" opacity="0.7" />

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
          <rect x="14" y="18" width="5" height="5" rx="1" fill="#f59e0b" transform="rotate(20 16 20)" />
          <rect x="100" y="14" width="5" height="5" rx="1" fill="#ec4899" transform="rotate(-25 102 16)" />
          <circle cx="24" cy="30" r="2.5" fill="#10b981" />
          <circle cx="96" cy="34" r="2.5" fill="#0ea5e9" />
          <rect x="60" y="8" width="4" height="4" rx="1" fill="#6366f1" transform="rotate(45 62 10)" />
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
