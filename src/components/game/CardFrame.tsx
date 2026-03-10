import { useId } from "react";
import type { CardCondition } from "@/data/gameCards";

export interface CardFrameProps {
  condition: CardCondition;
  width?: number;
  height?: number;
  className?: string;
}

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 90;

function DamagedFrame({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" aria-hidden>
      <rect
        x={1}
        y={1}
        width={w - 2}
        height={h - 2}
        rx={4}
        fill="none"
        stroke="#7f3d2a"
        strokeWidth={3}
        strokeDasharray="4 2 1 3 2 1"
        strokeLinecap="round"
      />
      <polygon points={`0,0 14,0 0,14`} fill="#1a1a2e" />
      <polygon points={`${w},${h} ${w - 12},${h} ${w},${h - 14}`} fill="#1a1a2e" />
      <line x1={20} y1={10} x2={60} y2={50} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
      <line x1={100} y1={5} x2={140} y2={35} stroke="rgba(0,0,0,0.2)" strokeWidth={0.8} />
      <line x1={40} y1={70} x2={90} y2={25} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
      <line x1={120} y1={55} x2={155} y2={85} stroke="rgba(0,0,0,0.2)" strokeWidth={0.8} />
      <ellipse cx={w - 30} cy={h - 15} rx={18} ry={10} fill="rgba(120,50,20,0.15)" />
    </svg>
  );
}

function AverageFrame({ w, h, vignetteId }: { w: number; h: number; vignetteId: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient id={vignetteId} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
        </radialGradient>
      </defs>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill="none" stroke="#8a7a5a" strokeWidth={2} />
      <polygon points={`${w},${h} ${w - 20},${h} ${w},${h - 20}`} fill="rgba(0,0,0,0.35)" />
      <polygon points={`${w},${h} ${w - 22},${h} ${w},${h - 22}`} fill="#c8b887" opacity={0.7} />
      <line x1={w - 22} y1={h} x2={w} y2={h - 22} stroke="#a09060" strokeWidth={0.8} />
      <rect x={0} y={0} width={w} height={h} fill={`url(#${vignetteId})`} />
    </svg>
  );
}

function GoodFrame({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" aria-hidden>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill="none" stroke="#4a5568" strokeWidth={1.5} />
    </svg>
  );
}

function PerfectFrame({ w, h, shimmerId }: { w: number; h: number; shimmerId: string }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full pointer-events-none card-frame-perfect" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={shimmerId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w * 0.4} height={h} fill={`url(#${shimmerId})`} className="card-frame-perfect-shimmer" style={{ transformOrigin: "left center" }} />
      <rect
        x={1}
        y={1}
        width={w - 2}
        height={h - 2}
        rx={4}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        className="card-frame-perfect-stroke"
      />
      {/* Star top-left */}
      <path d="M 8 4 L 9 8 L 14 8 L 10 11 L 11 15 L 8 12 L 5 15 L 6 11 L 2 8 L 7 8 Z" fill="rgba(255,215,0,0.8)" transform="scale(0.4)" />
      {/* Star top-right */}
      <path d="M 8 4 L 9 8 L 14 8 L 10 11 L 11 15 L 8 12 L 5 15 L 6 11 L 2 8 L 7 8 Z" fill="rgba(255,215,0,0.8)" transform={`translate(${w - 10}, 0) scale(0.4)`} />
      {/* Star bottom-left */}
      <path d="M 8 4 L 9 8 L 14 8 L 10 11 L 11 15 L 8 12 L 5 15 L 6 11 L 2 8 L 7 8 Z" fill="rgba(255,215,0,0.8)" transform={`translate(0, ${h - 10}) scale(0.4)`} />
      {/* Star bottom-right */}
      <path d="M 8 4 L 9 8 L 14 8 L 10 11 L 11 15 L 8 12 L 5 15 L 6 11 L 2 8 L 7 8 Z" fill="rgba(255,215,0,0.8)" transform={`translate(${w - 10}, ${h - 10}) scale(0.4)`} />
    </svg>
  );
}

export function CardFrame({ condition, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, className = "" }: CardFrameProps) {
  const w = width;
  const h = height;
  const vignetteId = useId().replace(/:/g, "-");
  const shimmerId = useId().replace(/:/g, "-");
  const cn = `pointer-events-none ${className}`.trim();

  switch (condition) {
    case "damaged":
      return <div className={cn}><DamagedFrame w={w} h={h} /></div>;
    case "average":
      return <div className={cn}><AverageFrame w={w} h={h} vignetteId={vignetteId} /></div>;
    case "good":
      return <div className={cn}><GoodFrame w={w} h={h} /></div>;
    case "perfect":
      return <div className={cn}><PerfectFrame w={w} h={h} shimmerId={shimmerId} /></div>;
    default:
      return <div className={cn}><GoodFrame w={w} h={h} /></div>;
  }
}
