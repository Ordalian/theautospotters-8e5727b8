import { useMemo } from "react";
import type { TileType, WeatherType } from "@/lib/boardGenerator";
import { TILE_CONFIG } from "@/lib/boardGenerator";
import type { PlacedCard, Position } from "@/types/board";
import { getMoveBudget, getReachablePositions } from "@/lib/boardMovement";
import { BoardCard } from "./BoardCard";
import {
  TILE_W,
  TILE_H,
  gridToScreen,
  getTileVariant,
  getBoardDimensions,
} from "@/lib/isometricUtils";
import { getTileVariants } from "@/lib/tileAssets";

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

const DIAMOND_CLIP = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

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
  // Cases accessibles
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

  // Dimensions du plateau iso
  const dims = useMemo(() => getBoardDimensions(), []);

  return (
    <div
      className="overflow-auto rounded-xl border border-border/50 bg-gradient-to-br from-muted/40 to-muted/20 shadow-inner"
      style={{ maxWidth: "100%", maxHeight: "70vh" }}
    >
      <div
        className="relative"
        style={{
          width: dims.totalW,
          height: dims.totalH,
          minWidth: dims.totalW,
          minHeight: dims.totalH,
        }}
      >
        {board.map((row, gy) =>
          row.map((tileType, gx) => {
            const { x: sx, y: sy } = gridToScreen(gx, gy);
            const key = `${gx},${gy}`;
            const isReachable = reachableSet.has(key);
            const isBlocked = tileType === "blocked";
            const isFlagP1 =
              flags.player1.x === gx && flags.player1.y === gy;
            const isFlagP2 =
              flags.player2.x === gx && flags.player2.y === gy;
            const cardHere = placedCards.find(
              (c) => c.position.x === gx && c.position.y === gy
            );
            const isSelected =
              selectedCard?.position.x === gx &&
              selectedCard?.position.y === gy;

            // Variante visuelle
            const variants = getTileVariants(tileType);
            const variantIdx = getTileVariant(gx, gy, variants.length || 1);
            const imgUrl = variants[variantIdx];

            const config = TILE_CONFIG[tileType];
            const zIndex = gx + gy + (cardHere ? 100 : 0);

            return (
              <div
                key={key}
                role="gridcell"
                aria-label={`${config.label} ${gx},${gy}`}
                className={`absolute transition-all duration-100 ${
                  isReachable || cardHere
                    ? "cursor-pointer"
                    : "cursor-default"
                }`}
                style={{
                  left: sx + dims.offsetX,
                  top: sy + dims.offsetY,
                  width: TILE_W,
                  height: TILE_H,
                  zIndex,
                }}
                onClick={() => {
                  if (cardHere) {
                    onCardSelect(cardHere);
                  } else if (isReachable) {
                    onTileClick({ x: gx, y: gy });
                  }
                }}
              >
                {/* Tile image ou fallback couleur */}
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover select-none pointer-events-none"
                    style={{ clipPath: DIAMOND_CLIP }}
                    draggable={false}
                  />
                ) : (
                  <div
                    className={`w-full h-full ${config.color}`}
                    style={{ clipPath: DIAMOND_CLIP }}
                  />
                )}

                {/* Highlight cases accessibles */}
                {isReachable && (
                  <div
                    className="absolute inset-0 bg-green-400/40 animate-pulse"
                    style={{ clipPath: DIAMOND_CLIP }}
                  />
                )}

                {/* Sélection active */}
                {isSelected && (
                  <div
                    className="absolute inset-0 ring-2 ring-amber-400 ring-inset"
                    style={{ clipPath: DIAMOND_CLIP }}
                  />
                )}

                {/* Drapeaux */}
                {isFlagP1 && (
                  <span className="absolute inset-0 flex items-center justify-center text-sm drop-shadow-md z-10">
                    🚩
                  </span>
                )}
                {isFlagP2 && !isFlagP1 && (
                  <span className="absolute inset-0 flex items-center justify-center text-sm drop-shadow-md z-10">
                    🏁
                  </span>
                )}

                {/* Carte posée */}
                {cardHere && (
                  <div
                    className="absolute inset-0 flex items-center justify-center z-20"
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
