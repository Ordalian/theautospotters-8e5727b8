import type { PlacedCard } from "@/types/board";

interface BoardCardProps {
  placedCard: PlacedCard;
  selected?: boolean;
  onClick?: () => void;
}

/** Mini carte pour affichage sur le plateau (w-8 h-12). */
export function BoardCard({
  placedCard,
  selected = false,
  onClick,
}: BoardCardProps) {
  const { card, currentHP } = placedCard;
  const maxHp = card.hp ?? 10;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-8 h-12 rounded border-2 flex flex-col items-center justify-center
        bg-card text-card-foreground shadow-md overflow-hidden
        ${selected ? "border-amber-500 ring-2 ring-amber-500/50" : "border-border"}
        hover:border-primary/60 transition-colors
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
      title={card.name}
    >
      <span className="text-lg leading-none" aria-hidden>
        🚗
      </span>
      <span className="text-[10px] font-medium mt-0.5 truncate w-full px-0.5">
        SPD {card.speed}
      </span>
      <span className="text-[9px] text-muted-foreground">
        HP {currentHP}/{maxHp}
      </span>
    </button>
  );
}
