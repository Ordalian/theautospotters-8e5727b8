import { CardFrame } from "./CardFrame";
import { getCardImageKey, useCardImage, CONDITION_IMAGE_FILTERS } from "@/lib/cardImageUtils";
import type { CardArchetype, CardCondition } from "@/data/gameCards";

const ARCHETYPE_FALLBACK: Record<CardArchetype, { gradient: string; emoji: string }> = {
  speed:     { gradient: "from-yellow-900/60 to-zinc-900", emoji: "⚡" },
  resilience: { gradient: "from-blue-900/60 to-zinc-900", emoji: "🛡️" },
  adaptability: { gradient: "from-cyan-900/60 to-zinc-900", emoji: "🧠" },
  power:     { gradient: "from-red-900/60 to-zinc-900", emoji: "⚔️" },
};

export interface CardImageProps {
  brand: string;
  model: string;
  archetype: CardArchetype;
  condition: CardCondition;
  className?: string;
  /** When true, container uses h-full instead of fixed 90px (e.g. for dash tile) */
  fillHeight?: boolean;
}

function FallbackImage({ archetype }: { archetype: CardArchetype }) {
  const { gradient, emoji } = ARCHETYPE_FALLBACK[archetype];
  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center rounded-lg`}
      aria-hidden
    >
      <span className="text-3xl opacity-80">{emoji}</span>
    </div>
  );
}

export function CardImage({ brand, model, archetype, condition, className = "", fillHeight = false }: CardImageProps) {
  const key = getCardImageKey(brand, model);
  const { url, loaded, error } = useCardImage(key);
  const filter = CONDITION_IMAGE_FILTERS[condition];
  const showImage = loaded && !error;

  return (
    <div
      className={`relative w-full rounded-lg overflow-hidden ${fillHeight ? "h-full" : ""} ${className}`}
      style={fillHeight ? undefined : { height: "90px" }}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: filter !== "none" ? filter : undefined }}
        />
      ) : (
        <FallbackImage archetype={archetype} />
      )}
      <CardFrame condition={condition} width={160} height={90} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
