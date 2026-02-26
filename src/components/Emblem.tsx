/**
 * Blason / emblem SVG with 10 levels of detail (1 = simplest, 10 = most detailed).
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
  const showFill = L >= 1;
  const showBand = L >= 2;
  const showInner = L >= 3;
  const showCorners = L >= 4;
  const showCrest = L >= 5;
  const showRays = L >= 6;
  const showRivets = L >= 7;
  const showBorder = L >= 8;
  const showDetail = L >= 9;
  const showFull = L >= 10;

  const primary = L >= 1 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)";
  const secondary = L >= 2 ? "hsl(var(--primary) / 0.7)" : "transparent";
  const accent = L >= 4 ? "hsl(var(--primary) / 0.5)" : "transparent";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* Shield outline */}
      <path
        d="M32 4 L58 14 L58 32 Q58 50 32 60 Q6 50 6 32 L6 14 Z"
        stroke={showBorder ? "hsl(var(--foreground) / 0.3)" : primary}
        strokeWidth={showBorder ? 1.5 : 2}
        fill={showFill ? primary : "transparent"}
      />
      {/* Central band */}
      {showBand && (
        <path
          d="M32 12 L52 20 L52 32 Q52 44 32 52 Q12 44 12 32 L12 20 Z"
          fill={secondary}
          stroke={showDetail ? "hsl(var(--primary) / 0.9)" : "none"}
          strokeWidth={0.5}
        />
      )}
      {/* Inner diamond / crest shape */}
      {showInner && (
        <path
          d="M32 22 L44 28 L44 36 Q44 44 32 48 Q20 44 20 36 L20 28 Z"
          fill={accent}
          stroke={showDetail ? "hsl(var(--primary))" : "none"}
          strokeWidth={0.5}
        />
      )}
      {/* Corner flourishes */}
      {showCorners && (
        <>
          <path d="M14 16 L22 14 L20 20" stroke={accent} strokeWidth={1} fill="none" />
          <path d="M50 16 L42 14 L44 20" stroke={accent} strokeWidth={1} fill="none" />
          <path d="M18 50 L22 44 L24 48" stroke={accent} strokeWidth={1} fill="none" />
          <path d="M46 50 L42 44 L40 48" stroke={accent} strokeWidth={1} fill="none" />
        </>
      )}
      {/* Top crest */}
      {showCrest && (
        <path
          d="M32 2 L36 8 L34 12 L32 10 L30 12 L28 8 Z"
          fill={primary}
          stroke={showDetail ? "hsl(var(--foreground) / 0.2)" : "none"}
        />
      )}
      {/* Radiating lines */}
      {showRays && (
        <>
          <line x1="32" y1="26" x2="32" y2="18" stroke={accent} strokeWidth={0.8} />
          <line x1="38" y1="30" x2="44" y2="26" stroke={accent} strokeWidth={0.6} />
          <line x1="26" y1="30" x2="20" y2="26" stroke={accent} strokeWidth={0.6} />
          <line x1="40" y1="38" x2="46" y2="40" stroke={accent} strokeWidth={0.5} />
          <line x1="24" y1="38" x2="18" y2="40" stroke={accent} strokeWidth={0.5} />
        </>
      )}
      {/* Rivets / dots */}
      {showRivets && (
        <>
          <circle cx="32" cy="32" r={showFull ? 2 : 1.5} fill="hsl(var(--background))" />
          <circle cx="24" cy="28" r={1} fill="hsl(var(--background) / 0.8)" />
          <circle cx="40" cy="28" r={1} fill="hsl(var(--background) / 0.8)" />
          <circle cx="28" cy="38" r={1} fill="hsl(var(--background) / 0.8)" />
          <circle cx="36" cy="38" r={1} fill="hsl(var(--background) / 0.8)" />
        </>
      )}
      {/* Extra detail (level 9) */}
      {showDetail && (
        <path
          d="M32 28 L36 32 L32 36 L28 32 Z"
          stroke="hsl(var(--background) / 0.9)"
          strokeWidth={0.8}
          fill="none"
        />
      )}
      {/* Full ornament (level 10) */}
      {showFull && (
        <>
          <path d="M32 6 L34 10 L32 12 L30 10 Z" fill="hsl(var(--background))" />
          <circle cx="32" cy="32" r={1} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={0.5} />
        </>
      )}
    </svg>
  );
}
