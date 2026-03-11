import type { TileType } from "@/lib/boardGenerator";
import { TILE_CONFIG } from "@/lib/boardGenerator";
import type { WeatherType } from "@/lib/boardGenerator";
import type { PlacedCard } from "@/types/board";
import type { Position } from "@/types/board";
import { getMoveBudget, getReachablePositions } from "@/lib/boardMovement";
import { BoardCard } from "./BoardCard";

export interface BoardProps {
  board: TileType[][];
  weather: WeatherType;
  placedCards: PlacedCard[];
  flags: { player1: Position; player2: Position };
  currentTurn: "player1" | "player2";
  selectedCard: PlacedCard | null;
  onCardSelect: (card: PlacedCard) => void;
  onTileClick: (position: Position) => void;
}

export function Board({
  board,
  weather,
  placedCards,
  flags,
  currentTurn,
  selectedCard,
  onCardSelect,
  onTileClick,
}: BoardProps) {
  const reachableSet = new Set<string>();
  if (selectedCard && selectedCard.owner === currentTurn) {
    const budget =
      getMoveBudget(selectedCard, weather) - selectedCard.moveBudgetUsed;
    const reachable = getReachablePositions(
      board,
      selectedCard.position,
      budget,
      placedCards,
      selectedCard.owner
    );
    for (const p of reachable) {
      reachableSet.add(`${p.x},${p.y}`);
    }
  }

  return (
    <div className="inline-block p-1 rounded-lg bg-muted/30 border border-border">
      <div
        className="grid grid-cols-20 gap-0.5 w-[min(100vw-2rem,560px)] max-w-full"
        style={{ aspectRatio: "1" }}
      >
        {board.map((row, y) =>
          row.map((tileType, x) => {
            const key = `${x},${y}`;
            const config = TILE_CONFIG[tileType];
            const isReachable = reachableSet.has(key);
            const isBlocked = tileType === "blocked";
            const isFlagP1 = flags.player1.x === x && flags.player1.y === y;
            const isFlagP2 = flags.player2.x === x && flags.player2.y === y;
            const cardHere = placedCards.find(
              (c) => c.position.x === x && c.position.y === y
            );
            const isSelected =
              selectedCard &&
              selectedCard.position.x === x &&
              selectedCard.position.y === y;

            return (
              <div
                key={key}
                role="gridcell"
                aria-label={`${config.label} ${x},${y}`}
                className={`
                  relative flex items-center justify-center min-w-0 min-h-0
                  rounded-sm ${config.color} text-white text-center
                  ${isBlocked ? "opacity-70" : ""}
                  ${isReachable ? "ring-2 ring-green-400 ring-inset shadow-inner" : ""}
                  ${isReachable ? "cursor-pointer hover:brightness-110" : ""}
                `}
                onClick={() => {
                  if (isReachable) onTileClick({ x, y });
                }}
              >
                {isFlagP1 && <span className="text-base" aria-hidden>🚩</span>}
                {isFlagP2 && !isFlagP1 && (
                  <span className="text-base" aria-hidden>🚩</span>
                )}
                {!isFlagP1 && !isFlagP2 && isBlocked && (
                  <span className="text-xs" aria-hidden>{config.emoji}</span>
                )}
                {!isFlagP1 && !isFlagP2 && !isBlocked && !cardHere && (
                  <span className="text-xs opacity-90" aria-hidden>
                    {config.emoji}
                  </span>
                )}
                {cardHere && (
                  <div
                    className="absolute inset-0 flex items-center justify-center p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardSelect(cardHere);
                    }}
                  >
                    <BoardCard
                      placedCard={cardHere}
                      selected={!!isSelected}
                      onClick={() => onCardSelect(cardHere)}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
