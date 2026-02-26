/**
 * Blason / emblem SVG with 10 levels of detail (1 = simplest, 10 = most detailed).
 * Each level adds progressively richer ornamentation.
 */
import { cn } from "@/lib/utils";

interface EmblemProps {
  level: number; // 1-10, 0 = locked/gray
  size?: number;
  className?: string;
}

const clampLevel = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

export function Emblem({ level, size = 64, className }: EmblemProps) {
  const L = clampLevel(level);

  // Color palette per level
  const locked = L === 0;
  const gray = "hsl(var(--muted-foreground) / 0.35)";

  // Shield fills evolve from bronze → silver → gold → platinum → legendary
  const shieldColors: Record<number, { fill: string; accent: string; glow: string }> = {
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
        {/* Shield gradient */}
        <linearGradient id={`sg-${L}`} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={lightFill} />
          <stop offset="100%" stopColor={darkFill} />
        </linearGradient>
        {/* Inner glow */}
        <radialGradient id={`ig-${L}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={c.fill} stopOpacity="0" />
        </radialGradient>
        {/* Gold shine */}
        {L >= 5 && (
          <linearGradient id={`shine-${L}`} x1="30" y1="10" x2="70" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
            <stop offset="60%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        )}
        {/* Level 10 radial burst */}
        {L >= 10 && (
          <radialGradient id="burst" cx="50%" cy="35%" r="45%">
            <stop offset="0%" stopColor="#FFF8CC" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {/* Level 10: Background aura */}
      {L >= 10 && (
        <circle cx="50" cy="48" r="46" fill="url(#burst)" opacity="0.5" />
      )}

      {/* Level 9+: Outer decorative ring */}
      {L >= 9 && (
        <>
          <path d="M50 4 L54 10 L50 8 L46 10 Z" fill={c.accent} opacity="0.8" />
          <path d="M50 96 L54 90 L50 92 L46 90 Z" fill={c.accent} opacity="0.5" />
          <path d="M8 42 L14 38 L12 42 L14 46 Z" fill={c.accent} opacity="0.4" />
          <path d="M92 42 L86 38 L88 42 L86 46 Z" fill={c.accent} opacity="0.4" />
        </>
      )}

      {/* Main shield shape */}
      <path
        d="M50 6 L84 18 L84 44 Q84 72 50 92 Q16 72 16 44 L16 18 Z"
        fill={locked ? gray : `url(#sg-${L})`}
        stroke={locked ? gray : darkFill}
        strokeWidth={L >= 8 ? 1.5 : 2}
      />

      {/* Inner glow overlay */}
      {L >= 1 && !locked && (
        <path
          d="M50 6 L84 18 L84 44 Q84 72 50 92 Q16 72 16 44 L16 18 Z"
          fill={`url(#ig-${L})`}
        />
      )}

      {/* Level 2+: Inner shield border */}
      {L >= 2 && (
        <path
          d="M50 14 L76 24 L76 44 Q76 66 50 82 Q24 66 24 44 L24 24 Z"
          fill="none"
          stroke={c.accent}
          strokeWidth={0.8}
          opacity="0.6"
        />
      )}

      {/* Level 3+: Horizontal band */}
      {L >= 3 && (
        <>
          <path
            d="M24 38 L76 38 L76 48 Q76 52 50 58 Q24 52 24 48 Z"
            fill={c.accent}
            opacity="0.25"
          />
          <line x1="24" y1="38" x2="76" y2="38" stroke={c.accent} strokeWidth={0.6} opacity="0.5" />
        </>
      )}

      {/* Level 4+: Corner flourishes */}
      {L >= 4 && (
        <>
          {/* Top-left */}
          <path d="M22 20 Q28 16 34 18 L30 22 Q26 20 22 22 Z" fill={c.accent} opacity="0.4" />
          {/* Top-right */}
          <path d="M78 20 Q72 16 66 18 L70 22 Q74 20 78 22 Z" fill={c.accent} opacity="0.4" />
          {/* Bottom-left */}
          <path d="M26 60 Q32 58 36 62 L32 66 Q28 62 24 64 Z" fill={c.accent} opacity="0.3" />
          {/* Bottom-right */}
          <path d="M74 60 Q68 58 64 62 L68 66 Q72 62 76 64 Z" fill={c.accent} opacity="0.3" />
        </>
      )}

      {/* Level 5+: Central emblem / star */}
      {L >= 5 && (
        <>
          <polygon
            points="50,26 54,36 64,36 56,42 59,52 50,46 41,52 44,42 36,36 46,36"
            fill={c.accent}
            stroke={darkFill}
            strokeWidth={0.5}
            opacity="0.9"
          />
          {/* Shine overlay */}
          <path
            d="M50 6 L84 18 L84 44 Q84 72 50 92 Q16 72 16 44 L16 18 Z"
            fill={`url(#shine-${L})`}
          />
        </>
      )}

      {/* Level 6+: Laurel branches */}
      {L >= 6 && (
        <>
          {/* Left laurel */}
          <path d="M30 56 Q26 50 28 44 Q32 48 30 56" fill={c.accent} opacity="0.5" />
          <path d="M28 62 Q22 56 24 50 Q30 54 28 62" fill={c.accent} opacity="0.4" />
          <path d="M26 68 Q20 62 22 56 Q28 60 26 68" fill={c.accent} opacity="0.3" />
          {/* Right laurel */}
          <path d="M70 56 Q74 50 72 44 Q68 48 70 56" fill={c.accent} opacity="0.5" />
          <path d="M72 62 Q78 56 76 50 Q70 54 72 62" fill={c.accent} opacity="0.4" />
          <path d="M74 68 Q80 62 78 56 Q72 60 74 68" fill={c.accent} opacity="0.3" />
        </>
      )}

      {/* Level 7+: Crown / top crest */}
      {L >= 7 && (
        <>
          <path
            d="M38 10 L42 4 L46 8 L50 2 L54 8 L58 4 L62 10 L56 12 L50 8 L44 12 Z"
            fill={c.accent}
            stroke={darkFill}
            strokeWidth={0.4}
          />
          {/* Crown jewels */}
          <circle cx="50" cy="5" r="1.2" fill={c.glow} />
          <circle cx="42" cy="6" r="0.8" fill={c.glow} opacity="0.7" />
          <circle cx="58" cy="6" r="0.8" fill={c.glow} opacity="0.7" />
        </>
      )}

      {/* Level 7+: Rivets along border */}
      {L >= 7 && (
        <>
          {[20, 30, 40, 50, 60].map((angle, i) => {
            const positions = [
              { cx: 30, cy: 20 }, { cx: 70, cy: 20 },
              { cx: 22, cy: 36 }, { cx: 78, cy: 36 },
              { cx: 20, cy: 52 }, { cx: 80, cy: 52 },
            ];
            return positions.slice(0, L >= 8 ? 6 : 4).map((pos, j) => (
              <circle
                key={`rivet-${i}-${j}`}
                cx={pos.cx}
                cy={pos.cy}
                r={1}
                fill={c.glow}
                opacity="0.5"
              />
            ));
          }).flat()}
        </>
      )}

      {/* Level 8+: Ornate inner shield */}
      {L >= 8 && (
        <>
          <path
            d="M50 20 L68 28 L68 44 Q68 60 50 72 Q32 60 32 44 L32 28 Z"
            fill="none"
            stroke={c.glow}
            strokeWidth={0.6}
            opacity="0.6"
          />
          {/* Inner cross pattern */}
          <line x1="50" y1="24" x2="50" y2="68" stroke={c.glow} strokeWidth={0.3} opacity="0.3" />
          <line x1="36" y1="40" x2="64" y2="40" stroke={c.glow} strokeWidth={0.3} opacity="0.3" />
        </>
      )}

      {/* Level 8+: Detailed border trim */}
      {L >= 8 && (
        <path
          d="M50 8 L82 19 L82 44 Q82 70 50 90 Q18 70 18 44 L18 19 Z"
          fill="none"
          stroke={c.glow}
          strokeWidth={0.5}
          strokeDasharray="2 3"
          opacity="0.4"
        />
      )}

      {/* Level 9+: Filigree scrollwork */}
      {L >= 9 && (
        <>
          <path
            d="M32 28 Q36 24 40 28 Q36 32 32 28"
            fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.6"
          />
          <path
            d="M68 28 Q64 24 60 28 Q64 32 68 28"
            fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.6"
          />
          <path
            d="M36 60 Q40 56 44 60 Q40 64 36 60"
            fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.5"
          />
          <path
            d="M64 60 Q60 56 56 60 Q60 64 64 60"
            fill="none" stroke={c.glow} strokeWidth={0.5} opacity="0.5"
          />
          {/* Vertical scroll on sides */}
          <path
            d="M20 30 Q16 36 20 42 Q24 36 20 30"
            fill="none" stroke={c.glow} strokeWidth={0.4} opacity="0.4"
          />
          <path
            d="M80 30 Q84 36 80 42 Q76 36 80 30"
            fill="none" stroke={c.glow} strokeWidth={0.4} opacity="0.4"
          />
        </>
      )}

      {/* Level 10: Full legendary ornament */}
      {L >= 10 && (
        <>
          {/* Wings */}
          <path
            d="M16 22 Q8 18 4 24 Q8 28 14 26 Q10 20 16 22"
            fill={c.accent} stroke={darkFill} strokeWidth={0.3} opacity="0.7"
          />
          <path
            d="M14 26 Q6 24 2 30 Q6 34 12 32 Q8 26 14 26"
            fill={c.accent} stroke={darkFill} strokeWidth={0.3} opacity="0.5"
          />
          <path
            d="M84 22 Q92 18 96 24 Q92 28 86 26 Q90 20 84 22"
            fill={c.accent} stroke={darkFill} strokeWidth={0.3} opacity="0.7"
          />
          <path
            d="M86 26 Q94 24 98 30 Q94 34 88 32 Q92 26 86 26"
            fill={c.accent} stroke={darkFill} strokeWidth={0.3} opacity="0.5"
          />
          {/* Central gem */}
          <circle cx="50" cy="40" r="4" fill={c.glow} opacity="0.8" />
          <circle cx="50" cy="40" r="2.5" fill={c.accent} />
          <circle cx="50" cy="40" r="1.2" fill="white" opacity="0.6" />
          {/* Bottom ribbon */}
          <path
            d="M36 80 L42 76 L50 80 L58 76 L64 80 L58 84 L50 80 L42 84 Z"
            fill={c.accent}
            stroke={darkFill}
            strokeWidth={0.4}
            opacity="0.8"
          />
          {/* Extra shine dots */}
          {[
            [38, 18], [62, 18], [26, 44], [74, 44],
            [30, 70], [70, 70], [50, 14],
          ].map(([cx, cy], i) => (
            <circle key={`gem-${i}`} cx={cx} cy={cy} r="0.8" fill="white" opacity="0.5" />
          ))}
        </>
      )}

      {/* Lock icon for level 0 */}
      {locked && (
        <>
          <rect x="44" y="42" width="12" height="10" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
          <path d="M47 42 L47 38 Q47 34 50 34 Q53 34 53 38 L53 42" fill="none" stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth="1.5" />
          <circle cx="50" cy="47" r="1.2" fill="hsl(var(--muted-foreground) / 0.3)" />
        </>
      )}
    </svg>
  );
}

// Simple color helpers (no deps needed)
function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.round(rgb.r * (1 - amount)),
    Math.round(rgb.g * (1 - amount)),
    Math.round(rgb.b * (1 - amount))
  );
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.round(rgb.r + (255 - rgb.r) * amount),
    Math.round(rgb.g + (255 - rgb.g) * amount),
    Math.round(rgb.b + (255 - rgb.b) * amount)
  );
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
}
