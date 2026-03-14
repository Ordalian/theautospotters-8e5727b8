import { Heart, Zap, Shield, Brain, Sword } from "lucide-react";
import type { CardRarity, CardArchetype, CardCondition } from "@/data/gameCards";
import { CONDITION_META, CONDITION_MODIFIERS } from "@/data/gameCards";
import { useLanguage } from "@/i18n/LanguageContext";
import { CardImage } from "./CardImage";

interface GameCardProps {
  name: string;
  brand: string;
  model?: string;
  rarity: CardRarity;
  archetype: CardArchetype;
  speed: number;
  resilience: number;
  adaptability: number;
  power: number;
  hp: number;
  condition?: CardCondition;
  flipped?: boolean;
  greyed?: boolean;
  count?: number;
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

export function GameCard({ name, brand, model: modelProp, rarity, archetype, speed, resilience, adaptability, power, hp, condition, flipped = false, greyed = false, count, onClick, className = "" }: GameCardProps) {
  const { t } = useLanguage();
  const style = RARITY_STYLES[rarity];
  const ArchIcon = ARCHETYPE_ICON[archetype];
  const mod = condition ? CONDITION_MODIFIERS[condition] : 1;
  const effectiveSpeed = Math.round(speed * mod);
  const effectiveResilience = Math.round(resilience * mod);
  const effectiveAdaptability = Math.round(adaptability * mod);
  const effectivePower = Math.round(power * mod);
  const model = modelProp ?? (name.replace(new RegExp(`^${brand}\\s+`), "").trim() || name);
  const cardCondition: CardCondition = condition ?? "good";

  if (flipped) {
    return (
      <div
        onClick={onClick}
        className={`relative w-[160px] h-[260px] rounded-xl border-2 border-muted bg-gradient-to-br from-muted to-card cursor-pointer transition-transform hover:scale-105 flex items-center justify-center ${className}`}
      >
        <div className="text-3xl">🏎️</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-[160px] h-[260px] rounded-xl border-2 ${style.border} bg-gradient-to-br ${style.bg} shadow-lg ${style.glow} cursor-pointer transition-transform hover:scale-105 flex flex-col overflow-hidden ${greyed ? "grayscale opacity-40" : ""} ${className}`}
    >
      {/* Header */}
      <div className="px-2 pt-2 pb-1 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <ArchIcon className="h-3 w-3 text-foreground/70" />
          <span className="text-[9px] uppercase font-bold tracking-wider text-foreground/70">{style.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
          <span className="text-[11px] font-bold text-red-400">{hp}</span>
          {count !== undefined && count >= 1 && !greyed && (
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded" title={(t as Record<string, string>).card_copies ?? "Copies"}>
              ×{count}
            </span>
          )}
        </div>
      </div>

      {/* Image + frame (Midjourney + SVG overlay) */}
      <div className="px-2 shrink-0">
        <CardImage brand={brand} model={model} archetype={archetype} condition={cardCondition} />
      </div>

      {/* Car name */}
      <div className="px-2 py-1 flex flex-col justify-center items-center text-center shrink-0">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{brand}</span>
        <span className="text-xs font-bold text-foreground leading-tight mt-0.5">{model}</span>
      </div>

      {/* Stats */}
      <div className="px-2 pb-2 space-y-0.5">
        <StatBar icon={Zap} label="SPD" value={effectiveSpeed} color="text-yellow-500" />
        <StatBar icon={Shield} label="RES" value={effectiveResilience} color="text-blue-500" />
        <StatBar icon={Brain} label="ADP" value={effectiveAdaptability} color="text-cyan-500" />
        <StatBar icon={Sword} label="PWR" value={effectivePower} color="text-red-500" />
      </div>

      {condition && (
        <div className={`mx-2 mb-2 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide text-center ${CONDITION_META[condition].badgeClass}`}>
          {CONDITION_META[condition].emoji} {(t as Record<string, string>)[`condition_${condition}`]}
        </div>
      )}
    </div>
  );
}
