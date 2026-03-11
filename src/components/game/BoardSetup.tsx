import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getCardPoints } from "@/lib/boardMovement";
import type { GameCardDef } from "@/data/gameCards";
import type { CardCondition } from "@/data/gameCards";
import type { Position } from "@/types/board";

const DECK_POINT_LIMIT = 30;
const MIN_CARDS = 3;
const MAX_CARDS = 10;

export type DeckCard = GameCardDef & { condition: CardCondition };

interface BoardSetupProps {
  deck: DeckCard[];
  /** Indices du deck placés + position sur le plateau */
  placedForPlayer: { deckIndex: number; position: Position }[];
  onPlaceCard: (deckIndex: number, position: Position) => void;
  onRemovePlacement: (position: Position) => void;
  onReady: () => void;
  playerLabel: "player1" | "player2";
}

export function BoardSetup({
  deck,
  placedForPlayer,
  onPlaceCard,
  onRemovePlacement,
  onReady,
  playerLabel,
}: BoardSetupProps) {
  const { t } = useLanguage();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const getCard = (deckIndex: number) => deck[deckIndex];
  const usedPoints = placedForPlayer.reduce(
    (sum, { deckIndex }) => {
      const card = getCard(deckIndex);
      return sum + getCardPoints(card.rarity, card.condition);
    },
    0
  );
  const startCols = playerLabel === "player1" ? [0, 1] : [18, 19];
  const canReady =
    placedForPlayer.length >= MIN_CARDS && usedPoints <= DECK_POINT_LIMIT;
  const placedDeckIndices = new Set(placedForPlayer.map((p) => p.deckIndex));
  const isCellOccupied = (x: number, y: number) =>
    placedForPlayer.some((p) => p.position.x === x && p.position.y === y);

  const isPlaced = (deckIndex: number) => placedDeckIndices.has(deckIndex);

  return (
    <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
      <h3 className="font-semibold text-foreground">
        {playerLabel === "player1"
          ? (t.board_setup_player1 as string)
          : (t.board_setup_player2 as string)}
      </h3>
      <p className="text-sm text-muted-foreground">
        {typeof t.board_setup_points === "function"
          ? (t.board_setup_points as (used: number, max: number) => string)(
              usedPoints,
              DECK_POINT_LIMIT
            )
          : String(t.board_setup_points)
              .replace("{used}", String(usedPoints))
              .replace("{max}", String(DECK_POINT_LIMIT))}
      </p>
      <p className="text-xs text-muted-foreground">
        {t.board_setup_min_max as string}
      </p>

      <div className="flex flex-wrap gap-2">
        {deck.map((card, deckIndex) => {
          const placed = isPlaced(deckIndex);
          const points = getCardPoints(card.rarity, card.condition);
          const selected = selectedCard === deckIndex;
          return (
            <button
              key={deckIndex}
              type="button"
              className={`
                flex flex-col items-center p-2 rounded-lg border-2 min-w-[80px]
                ${placed ? "border-amber-500 bg-amber-500/10 opacity-80" : ""}
                ${selected ? "border-primary ring-2 ring-primary/30" : "border-border bg-muted/30"}
                hover:border-primary/70
              `}
              onClick={() => {
                if (placed) return;
                setSelectedCard(selected ? null : deckIndex);
              }}
            >
              <span className="text-lg">🚗</span>
              <span className="text-xs font-medium truncate w-full">
                {card.model}
              </span>
              <span className="text-xs text-muted-foreground">
                SPD {card.speed} · {points} pt
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {t.board_setup_place_hint as string}
      </p>
      <div className="grid grid-cols-2 gap-1 w-24">
        {Array.from({ length: 20 }, (_, row) =>
          startCols.map((col) => ({ col, row }))
        )
          .flat()
          .map(({ col, row }) => (
            <button
              key={`${col},${row}`}
              type="button"
              disabled={!selectedCard || isCellOccupied(col, row)}
              className={`
                w-10 h-8 rounded border text-[10px]
                ${isCellOccupied(col, row) ? "bg-amber-500/20 border-amber-500" : "border-border bg-muted/50"}
                disabled:opacity-50
                ${selectedCard && !isCellOccupied(col, row) ? "hover:border-primary cursor-pointer" : ""}
              `}
              onClick={() => {
                if (selectedCard === null || isCellOccupied(col, row)) return;
                const card = getCard(selectedCard);
                if (
                  usedPoints + getCardPoints(card.rarity, card.condition) >
                    DECK_POINT_LIMIT ||
                  placedForPlayer.length >= MAX_CARDS
                )
                  return;
                onPlaceCard(selectedCard, { x: col, y: row });
                setSelectedCard(null);
              }}
            >
              {isCellOccupied(col, row)
                ? (() => {
                    const p = placedForPlayer.find(
                      (q) => q.position.x === col && q.position.y === row
                    );
                    return p != null ? getCard(p.deckIndex).speed : "?";
                  })()
                : ""}
            </button>
          ))}
      </div>

      {placedForPlayer.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {placedForPlayer.map(({ deckIndex, position }) => {
            const card = getCard(deckIndex);
            return (
              <span
                key={`${deckIndex}-${position.x}-${position.y}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs"
              >
                {card.model} ({position.x},{position.y})
                <button
                  type="button"
                  onClick={() => onRemovePlacement(position)}
                  className="text-destructive hover:underline"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={!canReady}
        onClick={onReady}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t.board_setup_ready as string}
      </button>
    </div>
  );
}
