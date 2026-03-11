import type { PlacedCard } from "@/types/board";

interface BoardCardProps {
  placedCard: PlacedCard;
  selected?: boolean;
  onClick?: () => void;
}

/** Mini carte isométrique pour affichage sur le plateau. */
export function BoardCard({
  placedCard,
  selected = false,
  onClick,
}: BoardCardProps) {
  const { card, currentHP, owner } = placedCard;
  const maxHp = card.hp ?? 10;
  const hpPercent = Math.max(0, Math.min(100, (currentHP / maxHp) * 100));

  const ownerColor =
    owner === "player1"
      ? "from-blue-500 to-blue-600"
      : "from-red-500 to-red-600";
  const borderColor = selected
    ? "border-amber-400 shadow-amber-400/50"
    : "border-white/60";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-10 h-6 rounded-sm border
        bg-gradient-to-br ${ownerColor}
        ${borderColor}
        shadow-lg
        flex items-center justify-center
        transition-all duration-150
        hover:scale-110 hover:z-50
        ${selected ? "scale-110 z-50" : ""}
      `}
      title={`${card.name} — HP ${currentHP}/${maxHp}`}
    >
      {/* Emoji voiture */}
      <span className="text-[10px] leading-none drop-shadow-md">🏎️</span>

      {/* Barre HP */}
      <div className="absolute -bottom-1 left-0.5 right-0.5 h-[3px] bg-black/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            hpPercent > 50
              ? "bg-green-400"
              : hpPercent > 25
              ? "bg-yellow-400"
              : "bg-red-400"
          }`}
          style={{ width: `${hpPercent}%` }}
        />
      </div>
    </button>
  );
}
