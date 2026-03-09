import { Heart, Zap, Shield, Brain, Sword } from "lucide-react";
import type { CardRarity, CardArchetype } from "@/data/gameCards";

interface GameCardProps {
  name: string;
  brand: string;
  rarity: CardRarity;
  archetype: CardArchetype;
  speed: number;
  resilience: number;
  adaptability: number;
  power: number;
  hp: number;
  flipped?: boolean;
  onClick?: () => void;
  className?: string;
}

const RARITY_STYLES: Record<CardRarity, { border: string; glow: string; label: string; bg: string }> = {
  common: { border: "border-zinc-500", glow: "", label: "Common", bg: "from-zinc-800 to-zinc-900" },
  uncommon: { border: "border-emerald-500", glow: "shadow-emerald-500/20", label: "Uncommon", bg: "from-emerald-900/40 to-zinc-900" },
  rare: { border: "border-violet-500", glow: "shadow-violet-500/30", label: "Rare", bg: "from-violet-900/40 to-zinc-900" },
  mythic: { border: "border-amber-400", glow: "shadow-amber-400/40 animate-pulse", label: "Mythic", bg: "from-amber-900/40 to-zinc-900" },
};

const ARCHETYPE_ICON: Record<CardArchetype, typeof Zap> = {
  speed: Zap,
  resilience: Shield,
  adaptability: Brain,
  power: Sword,
};

function StatBar({ icon: Icon, label, value, color }: { icon: typeof Zap; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 ${color} shrink-0`} />
      <span className="text-[10px] text-muted-foreground w-6 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className="text-[10px] font-bold text-foreground w-3 text-right">{value}</span>
    </div>
  );
}

export function GameCard({ name, brand, rarity, archetype, speed, resilience, adaptability, power, hp, flipped = false, onClick, className = "" }: GameCardProps) {
  const style = RARITY_STYLES[rarity];
  const ArchIcon = ARCHETYPE_ICON[archetype];

  if (flipped) {
    return (
      <div
        onClick={onClick}
        className={`relative w-[140px] h-[200px] rounded-xl border-2 border-muted bg-gradient-to-br from-muted to-card cursor-pointer transition-transform hover:scale-105 flex items-center justify-center ${className}`}
      >
        <div className="text-3xl">🏎️</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-[140px] h-[200px] rounded-xl border-2 ${style.border} bg-gradient-to-br ${style.bg} shadow-lg ${style.glow} cursor-pointer transition-transform hover:scale-105 flex flex-col overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-2 pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <ArchIcon className="h-3 w-3 text-foreground/70" />
          <span className="text-[9px] uppercase font-bold tracking-wider text-foreground/70">{style.label}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
          <span className="text-[11px] font-bold text-red-400">{hp}</span>
        </div>
      </div>

      {/* Car name area */}
      <div className="px-2 py-2 flex-1 flex flex-col justify-center items-center text-center">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{brand}</span>
        <span className="text-xs font-bold text-foreground leading-tight mt-0.5">{name.replace(`${brand} `, "")}</span>
      </div>

      {/* Stats */}
      <div className="px-2 pb-2 space-y-0.5">
        <StatBar icon={Zap} label="SPD" value={speed} color="text-yellow-500" />
        <StatBar icon={Shield} label="RES" value={resilience} color="text-blue-500" />
        <StatBar icon={Brain} label="ADP" value={adaptability} color="text-cyan-500" />
        <StatBar icon={Sword} label="PWR" value={power} color="text-red-500" />
      </div>
    </div>
  );
}
