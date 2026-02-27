/**
 * Emblem SVG with 4 unique shapes and 10 levels of detail.
 * Shapes: shield (spotter), globe (globe_trotter), diamond (rarity_hunter_5..10), hexagon (brand_collector).
 */
import { cn } from "@/lib/utils";
import type { EmblemShape } from "@/lib/achievements";

interface EmblemProps {
  level: number; // 1-10, 0 = locked/gray
  shape?: EmblemShape;
  size?: number;
  className?: string;
}

const clampLevel = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

// Shape path definitions
const SHAPE_PATHS: Record<EmblemShape, { outer: string; inner: string; band: string }> = {
  shield: {
    outer: "M50 6 L84 18 L84 44 Q84 72 50 92 Q16 72 16 44 L16 18 Z",
    inner: "M50 14 L76 24 L76 44 Q76 66 50 82 Q24 66 24 44 L24 24 Z",
    band: "M24 38 L76 38 L76 48 Q76 52 50 58 Q24 52 24 48 Z",
  },
  globe: {
    outer: "M50 8 A42 42 0 1 1 50 92 A42 42 0 1 1 50 8 Z",
    inner: "M50 16 A34 34 0 1 1 50 84 A34 34 0 1 1 50 16 Z",
    band: "M16 46 L84 46 L84 54 L16 54 Z",
  },
  diamond: {
    outer: "M50 4 L90 50 L50 96 L10 50 Z",
    inner: "M50 16 L80 50 L50 84 L20 50 Z",
    band: "M24 46 L76 46 L76 54 L24 54 Z",
  },
  hexagon: {
    outer: "M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z",
    inner: "M50 16 L78 34 L78 66 L50 84 L22 66 L22 34 Z",
    band: "M22 42 L78 42 L78 58 L22 58 Z",
  },
};

// Crown paths per shape
const CROWN_PATHS: Record<EmblemShape, string> = {
  shield: "M38 10 L42 4 L46 8 L50 2 L54 8 L58 4 L62 10 L56 12 L50 8 L44 12 Z",
  globe: "M36 12 L40 4 L44 8 L50 2 L56 8 L60 4 L64 12 L58 14 L50 10 L42 14 Z",
  diamond: "M38 8 L42 0 L46 4 L50 -2 L54 4 L58 0 L62 8 L56 10 L50 6 L44 10 Z",
  hexagon: "M36 10 L40 2 L44 6 L50 0 L56 6 L60 2 L64 10 L58 12 L50 8 L42 12 Z",
};

// Shape-specific decorations for high levels
function getShapeDecorations(shape: EmblemShape, L: number, c: ColorSet, darkFill: string) {
  const elements: React.ReactNode[] = [];

  if (shape === "globe" && L >= 4) {
    // Meridians and parallels
    elements.push(
      <ellipse key="mer1" cx="50" cy="50" rx="20" ry="38" fill="none" stroke={c.accent} strokeWidth={0.5} opacity={0.3} />,
      <ellipse key="mer2" cx="50" cy="50" rx="38" ry="20" fill="none" stroke={c.accent} strokeWidth={0.5} opacity={0.3} transform="rotate(90 50 50)" />,
    );
    if (L >= 6) {
      elements.push(
        <ellipse key="mer3" cx="50" cy="50" rx="12" ry="38" fill="none" stroke={c.accent} strokeWidth={0.4} opacity={0.25} />,
        <line key="eq" x1="12" y1="50" x2="88" y2="50" stroke={c.accent} strokeWidth={0.4} opacity={0.3} />,
      );
    }
    if (L >= 8) {
      // Compass rose
      elements.push(
        <polygon key="compass" points="50,20 52,48 50,16 48,48" fill={c.glow} opacity={0.4} />,
        <polygon key="compass2" points="80,50 52,52 84,50 52,48" fill={c.glow} opacity={0.3} />,
      );
    }
  }

  if (shape === "diamond" && L >= 4) {
    // Facet lines
    elements.push(
      <line key="f1" x1="50" y1="4" x2="30" y2="50" stroke={c.accent} strokeWidth={0.5} opacity={0.3} />,
      <line key="f2" x1="50" y1="4" x2="70" y2="50" stroke={c.accent} strokeWidth={0.5} opacity={0.3} />,
      <line key="f3" x1="30" y1="50" x2="50" y2="96" stroke={c.accent} strokeWidth={0.4} opacity={0.25} />,
      <line key="f4" x1="70" y1="50" x2="50" y2="96" stroke={c.accent} strokeWidth={0.4} opacity={0.25} />,
    );
    if (L >= 6) {
      elements.push(
        <line key="f5" x1="50" y1="4" x2="50" y2="96" stroke={c.accent} strokeWidth={0.3} opacity={0.2} />,
        <line key="f6" x1="10" y1="50" x2="90" y2="50" stroke={c.accent} strokeWidth={0.3} opacity={0.2} />,
      );
    }
    if (L >= 8) {
      // Inner sparkle facets
      elements.push(
        <polygon key="inner-facet" points="50,30 60,50 50,70 40,50" fill={c.glow} opacity={0.15} />,
      );
    }
  }

  if (shape === "hexagon" && L >= 4) {
    // Inner hex pattern
    elements.push(
      <path key="hex-inner" d="M50 26 L68 38 L68 62 L50 74 L32 62 L32 38 Z" fill="none" stroke={c.accent} strokeWidth={0.6} opacity={0.3} />,
    );
    if (L >= 6) {
      // Gear teeth effect
      const teeth = [
        "M50 6 L53 12 L47 12 Z",
        "M88 28 L82 31 L85 25 Z",
        "M88 72 L82 69 L85 75 Z",
        "M50 94 L47 88 L53 88 Z",
        "M12 72 L18 69 L15 75 Z",
        "M12 28 L18 31 L15 25 Z",
      ];
      teeth.forEach((d, i) => {
        elements.push(<path key={`tooth-${i}`} d={d} fill={c.accent} opacity={0.4} />);
      });
    }
    if (L >= 8) {
      // Inner bolts
      const bolts = [
        [50, 20], [72, 32], [72, 68], [50, 80], [28, 68], [28, 32],
      ];
      bolts.forEach(([cx, cy], i) => {
        elements.push(<circle key={`bolt-${i}`} cx={cx} cy={cy} r={1.5} fill={c.glow} opacity={0.5} />);
      });
    }
  }

  if (shape === "shield" && L >= 4) {
    // Corner flourishes (original)
    elements.push(
      <path key="fl-tl" d="M22 20 Q28 16 34 18 L30 22 Q26 20 22 22 Z" fill={c.accent} opacity={0.4} />,
      <path key="fl-tr" d="M78 20 Q72 16 66 18 L70 22 Q74 20 78 22 Z" fill={c.accent} opacity={0.4} />,
      <path key="fl-bl" d="M26 60 Q32 58 36 62 L32 66 Q28 62 24 64 Z" fill={c.accent} opacity={0.3} />,
      <path key="fl-br" d="M74 60 Q68 58 64 62 L68 66 Q72 62 76 64 Z" fill={c.accent} opacity={0.3} />,
    );
  }

  return elements;
}

// Central emblem per shape
function getCentralEmblem(shape: EmblemShape, L: number, c: ColorSet, darkFill: string) {
  if (L < 5) return null;

  switch (shape) {
    case "shield":
      return (
        <polygon
          points="50,26 54,36 64,36 56,42 59,52 50,46 41,52 44,42 36,36 46,36"
          fill={c.accent} stroke={darkFill} strokeWidth={0.5} opacity={0.9}
        />
      );
    case "globe":
      // Compass star
      return (
        <g opacity={0.9}>
          <polygon points="50,30 53,46 50,28 47,46" fill={c.accent} stroke={darkFill} strokeWidth={0.3} />
          <polygon points="50,70 53,54 50,72 47,54" fill={c.accent} stroke={darkFill} strokeWidth={0.3} />
          <polygon points="34,50 46,47 32,50 46,53" fill={c.accent} stroke={darkFill} strokeWidth={0.3} />
          <polygon points="66,50 54,47 68,50 54,53" fill={c.accent} stroke={darkFill} strokeWidth={0.3} />
          <circle cx="50" cy="50" r="3" fill={c.accent} stroke={darkFill} strokeWidth={0.4} />
        </g>
      );
    case "diamond":
      // Inner brilliant cut
      return (
        <g opacity={0.9}>
          <polygon points="50,24 62,44 50,52 38,44" fill={c.accent} stroke={darkFill} strokeWidth={0.4} />
          <polygon points="50,76 62,56 50,48 38,56" fill={c.accent} stroke={darkFill} strokeWidth={0.4} opacity={0.7} />
        </g>
      );
    case "hexagon":
      // Wrench / gear symbol
      return (
        <g opacity={0.9}>
          <circle cx="50" cy="50" r="8" fill="none" stroke={c.accent} strokeWidth={1.5} />
          <circle cx="50" cy="50" r="3" fill={c.accent} />
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 50 + 8 * Math.cos(rad);
            const y1 = 50 + 8 * Math.sin(rad);
            const x2 = 50 + 12 * Math.cos(rad);
            const y2 = 50 + 12 * Math.sin(rad);
            return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.accent} strokeWidth={2} />;
          })}
        </g>
      );
    default:
      return null;
  }
}

// Laurel branches adapted per shape
function getLaurels(shape: EmblemShape, L: number, c: ColorSet) {
  if (L < 6) return null;
  
  // Different laurel positions per shape
  const configs: Record<EmblemShape, Array<[string, number]>> = {
    shield: [
      ["M30 56 Q26 50 28 44 Q32 48 30 56", 0.5],
      ["M28 62 Q22 56 24 50 Q30 54 28 62", 0.4],
      ["M26 68 Q20 62 22 56 Q28 60 26 68", 0.3],
      ["M70 56 Q74 50 72 44 Q68 48 70 56", 0.5],
      ["M72 62 Q78 56 76 50 Q70 54 72 62", 0.4],
      ["M74 68 Q80 62 78 56 Q72 60 74 68", 0.3],
    ],
    globe: [
      ["M20 60 Q16 54 18 48 Q22 52 20 60", 0.5],
      ["M18 66 Q12 60 14 54 Q20 58 18 66", 0.4],
      ["M80 60 Q84 54 82 48 Q78 52 80 60", 0.5],
      ["M82 66 Q88 60 86 54 Q80 58 82 66", 0.4],
    ],
    diamond: [
      ["M22 50 Q18 44 20 38 Q24 42 22 50", 0.5],
      ["M20 56 Q14 50 16 44 Q22 48 20 56", 0.4],
      ["M78 50 Q82 44 80 38 Q76 42 78 50", 0.5],
      ["M80 56 Q86 50 84 44 Q78 48 80 56", 0.4],
    ],
    hexagon: [
      ["M20 48 Q16 42 18 36 Q22 40 20 48", 0.5],
      ["M18 56 Q12 50 14 44 Q20 48 18 56", 0.4],
      ["M80 48 Q84 42 82 36 Q78 40 80 48", 0.5],
      ["M82 56 Q88 50 86 44 Q80 48 82 56", 0.4],
    ],
  };

  return (
    <>
      {configs[shape].map(([d, opacity], i) => (
        <path key={`laurel-${i}`} d={d} fill={c.accent} opacity={opacity} />
      ))}
    </>
  );
}

// Level 10 wings per shape
function getWings(shape: EmblemShape, c: ColorSet, darkFill: string) {
  const wingConfigs: Record<EmblemShape, Array<[string, number]>> = {
    shield: [
      ["M16 22 Q8 18 4 24 Q8 28 14 26 Q10 20 16 22", 0.7],
      ["M14 26 Q6 24 2 30 Q6 34 12 32 Q8 26 14 26", 0.5],
      ["M84 22 Q92 18 96 24 Q92 28 86 26 Q90 20 84 22", 0.7],
      ["M86 26 Q94 24 98 30 Q94 34 88 32 Q92 26 86 26", 0.5],
    ],
    globe: [
      ["M12 34 Q4 28 0 34 Q4 38 10 36 Q6 30 12 34", 0.7],
      ["M10 38 Q2 36 -2 42 Q2 46 8 44 Q4 38 10 38", 0.5],
      ["M88 34 Q96 28 100 34 Q96 38 90 36 Q94 30 88 34", 0.7],
      ["M90 38 Q98 36 102 42 Q98 46 92 44 Q96 38 90 38", 0.5],
    ],
    diamond: [
      ["M14 38 Q6 32 2 38 Q6 42 12 40 Q8 34 14 38", 0.7],
      ["M12 42 Q4 40 0 46 Q4 50 10 48 Q6 42 12 42", 0.5],
      ["M86 38 Q94 32 98 38 Q94 42 88 40 Q92 34 86 38", 0.7],
      ["M88 42 Q96 40 100 46 Q96 50 90 48 Q94 42 88 42", 0.5],
    ],
    hexagon: [
      ["M14 30 Q6 24 2 30 Q6 34 12 32 Q8 26 14 30", 0.7],
      ["M12 34 Q4 32 0 38 Q4 42 10 40 Q6 34 12 34", 0.5],
      ["M86 30 Q94 24 98 30 Q94 34 88 32 Q92 26 86 30", 0.7],
      ["M88 34 Q96 32 100 38 Q96 42 90 40 Q94 34 88 34", 0.5],
    ],
  };

  return (
    <>
      {wingConfigs[shape].map(([d, opacity], i) => (
        <path key={`wing-${i}`} d={d} fill={c.accent} stroke={darkFill} strokeWidth={0.3} opacity={opacity} />
      ))}
    </>
  );
}

interface ColorSet {
  fill: string;
  accent: string;
  glow: string;
}

export function Emblem({ level, shape = "shield", size = 64, className }: EmblemProps) {
  const L = clampLevel(level);
  const locked = L === 0;
  const gray = "hsl(var(--muted-foreground) / 0.35)";

  const shieldColors: Record<number, ColorSet> = {
    0:  { fill: gray, accent: gray, glow: "transparent" },
    1:  { fill: "#8B6914", accent: "#A07D1C", glow: "transparent" },
    2:  { fill: "#9C7A1E", accent: "#B8922A", glow: "transparent" },
    3:  { fill: "#7C8A98", accent: "#A0B0C0", glow: "transparent" },
    4:  { fill: "#8E9EAE", accent: "#B8C8D8", glow: "#B8C8D8" },
    5:  { fill: "#C8A520", accent: "#E8C840", glow: "#E8C840" },
    6:  { fill: "#D4AF37", accent: "#F0D060", glow: "#F0D060" },
    7:  { fill: "#D4AF37", accent: "#FFE066", glow: "#FFE066" },
    8:  { fill: "#E0C050", accent: "#FFE88A", glow: "#FFE88A" },
    9:  { fill: "#D4AF37", accent: "#FFF0A0", glow: "#FFF0A0" },
    10: { fill: "#D4AF37", accent: "#FFF8CC", glow: "#FFFFFF" },
  };

  const c = shieldColors[L];
  const darkFill = locked ? gray : darken(c.fill, 0.3);
  const lightFill = locked ? gray : lighten(c.fill, 0.2);
  const paths = SHAPE_PATHS[shape];
  const uid = `${shape}-${L}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`sg-${uid}`} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={lightFill} />
          <stop offset="100%" stopColor={darkFill} />
        </linearGradient>
        <radialGradient id={`ig-${uid}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={c.fill} stopOpacity="0" />
        </radialGradient>
        {L >= 5 && (
          <linearGradient id={`shine-${uid}`} x1="30" y1="10" x2="70" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
            <stop offset="60%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        )}
        {L >= 10 && (
          <radialGradient id={`burst-${uid}`} cx="50%" cy="35%" r="45%">
            <stop offset="0%" stopColor="#FFF8CC" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {/* Level 10: Background aura */}
      {L >= 10 && (
        <circle cx="50" cy="50" r="48" fill={`url(#burst-${uid})`} opacity="0.5" />
      )}

      {/* Level 9+: Directional accents */}
      {L >= 9 && (
        <>
          <path d="M50 0 L53 6 L50 4 L47 6 Z" fill={c.accent} opacity="0.8" />
          <path d="M50 100 L53 94 L50 96 L47 94 Z" fill={c.accent} opacity="0.5" />
          <path d="M4 46 L10 42 L8 46 L10 50 Z" fill={c.accent} opacity="0.4" />
          <path d="M96 46 L90 42 L92 46 L90 50 Z" fill={c.accent} opacity="0.4" />
        </>
      )}

      {/* Main shape */}
      <path
        d={paths.outer}
        fill={locked ? gray : `url(#sg-${uid})`}
        stroke={locked ? gray : darkFill}
        strokeWidth={L >= 8 ? 1.5 : 2}
      />

      {/* Inner glow */}
      {L >= 1 && !locked && (
        <path d={paths.outer} fill={`url(#ig-${uid})`} />
      )}

      {/* Level 2+: Inner border */}
      {L >= 2 && (
        <path d={paths.inner} fill="none" stroke={c.accent} strokeWidth={0.8} opacity="0.6" />
      )}

      {/* Level 3+: Band */}
      {L >= 3 && (
        <>
          <path d={paths.band} fill={c.accent} opacity="0.25" />
          <line
            x1={shape === "diamond" ? "24" : shape === "globe" ? "16" : shape === "hexagon" ? "22" : "24"}
            y1={shape === "diamond" ? "46" : shape === "globe" ? "46" : shape === "hexagon" ? "42" : "38"}
            x2={shape === "diamond" ? "76" : shape === "globe" ? "84" : shape === "hexagon" ? "78" : "76"}
            y2={shape === "diamond" ? "46" : shape === "globe" ? "46" : shape === "hexagon" ? "42" : "38"}
            stroke={c.accent} strokeWidth={0.6} opacity="0.5"
          />
        </>
      )}

      {/* Shape-specific decorations */}
      {getShapeDecorations(shape, L, c, darkFill)}

      {/* Level 5+: Central emblem */}
      {getCentralEmblem(shape, L, c, darkFill)}

      {/* Level 5+: Shine overlay */}
      {L >= 5 && (
        <path d={paths.outer} fill={`url(#shine-${uid})`} />
      )}

      {/* Level 6+: Laurels */}
      {getLaurels(shape, L, c)}

      {/* Level 7+: Crown */}
      {L >= 7 && (
        <>
          <path d={CROWN_PATHS[shape]} fill={c.accent} stroke={darkFill} strokeWidth={0.4} />
          <circle cx="50" cy={shape === "diamond" ? 1 : 5} r="1.2" fill={c.glow} />
          <circle cx={shape === "diamond" ? 42 : 42} cy={shape === "diamond" ? 3 : 6} r="0.8" fill={c.glow} opacity="0.7" />
          <circle cx={shape === "diamond" ? 58 : 58} cy={shape === "diamond" ? 3 : 6} r="0.8" fill={c.glow} opacity="0.7" />
        </>
      )}

      {/* Level 8+: Dashed border */}
      {L >= 8 && (
        <path
          d={paths.outer}
          fill="none"
          stroke={c.glow}
          strokeWidth={0.5}
          strokeDasharray="2 3"
          opacity="0.4"
          transform="scale(0.95) translate(2.5 2.5)"
        />
      )}

      {/* Level 9+: Filigree */}
      {L >= 9 && (
        <>
          <path d="M32 28 Q36 24 40 28 Q36 32 32 28" fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.6" />
          <path d="M68 28 Q64 24 60 28 Q64 32 68 28" fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.6" />
          <path d="M36 68 Q40 64 44 68 Q40 72 36 68" fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.5" />
          <path d="M64 68 Q60 64 56 68 Q60 72 64 68" fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.5" />
        </>
      )}

      {/* Level 10: Wings + gem + ribbon */}
      {L >= 10 && (
        <>
          {getWings(shape, c, darkFill)}
          <circle cx="50" cy="50" r="4" fill={c.glow} opacity="0.8" />
          <circle cx="50" cy="50" r="2.5" fill={c.accent} />
          <circle cx="50" cy="50" r="1.2" fill="white" opacity="0.6" />
          <path
            d="M36 84 L42 80 L50 84 L58 80 L64 84 L58 88 L50 84 L42 88 Z"
            fill={c.accent} stroke={darkFill} strokeWidth={0.4} opacity="0.8"
          />
          {[[38, 18], [62, 18], [26, 50], [74, 50], [34, 76], [66, 76], [50, 14]].map(([cx, cy], i) => (
            <circle key={`gem-${i}`} cx={cx} cy={cy} r={0.8} fill="white" opacity={0.5} />
          ))}
        </>
      )}

      {/* Lock icon for level 0 */}
      {locked && (
        <>
          <rect x="44" y="44" width="12" height="10" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
          <path d="M47 44 L47 40 Q47 36 50 36 Q53 36 53 40 L53 44" fill="none" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth="1.5" />
          <circle cx="50" cy="49" r="1.2" fill="hsl(var(--muted-foreground) / 0.3)" />
        </>
      )}
    </svg>
  );
}

// Color helpers
function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(Math.round(rgb.r * (1 - amount)), Math.round(rgb.g * (1 - amount)), Math.round(rgb.b * (1 - amount)));
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(Math.round(rgb.r + (255 - rgb.r) * amount), Math.round(rgb.g + (255 - rgb.g) * amount), Math.round(rgb.b + (255 - rgb.b) * amount));
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
}
