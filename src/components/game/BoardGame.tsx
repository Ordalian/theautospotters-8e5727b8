import { useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  generateBoard,
  generateWeather,
  TILE_CONFIG,
  WEATHER_CONFIG,
} from "@/lib/boardGenerator";
import type { TileType, WeatherType } from "@/lib/boardGenerator";
import {
  getTurnOrder,
  getMoveBudget,
  getReachablePositions,
} from "@/lib/boardMovement";
import type { PlacedCard } from "@/types/board";
import type { Position } from "@/types/board";
import { Board } from "./Board";
import { BoardSetup, type DeckCard } from "./BoardSetup";

type GamePhase = "setup" | "playing" | "ended";
type Winner = "player1" | "player2" | null;

const FLAGS = {
  player1: { x: 0, y: 10 } as Position,
  player2: { x: 19, y: 10 } as Position,
};

function createPlacedCard(
  deckCard: DeckCard,
  position: Position,
  owner: "player1" | "player2",
  id: string
): PlacedCard {
  return {
    id,
    card: { ...deckCard, condition: deckCard.condition },
    owner,
    position: { ...position },
    currentHP: deckCard.hp ?? 10,
    moveBudgetUsed: 0,
  };
}

interface BoardGameProps {
  deckPlayer1: DeckCard[];
  deckPlayer2: DeckCard[];
  onGameEnd?: (winner: "player1" | "player2") => void;
}

export function BoardGame({
  deckPlayer1,
  deckPlayer2,
  onGameEnd,
}: BoardGameProps) {
  const { t } = useLanguage();
  const [board] = useState<TileType[][]>(() => generateBoard());
  const [weather] = useState<WeatherType>(() => generateWeather());
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [winner, setWinner] = useState<Winner>(null);

  const [placedSetupP1, setPlacedSetupP1] = useState<
    { deckIndex: number; position: Position }[]
  >([]);
  const [placedSetupP2, setPlacedSetupP2] = useState<
    { deckIndex: number; position: Position }[]
  >([]);
  const [readyP1, setReadyP1] = useState(false);
  const [readyP2, setReadyP2] = useState(false);

  const [placedCards, setPlacedCards] = useState<PlacedCard[]>([]);
  const [currentTurn, setCurrentTurn] = useState<"player1" | "player2">(
    "player1"
  );
  const [selectedCard, setSelectedCard] = useState<PlacedCard | null>(null);
  const [turnOrderIndex, setTurnOrderIndex] = useState(0);

  const startGame = useCallback(() => {
    const p1Cards: PlacedCard[] = placedSetupP1.map(({ deckIndex, position }, i) =>
      createPlacedCard(
        deckPlayer1[deckIndex],
        position,
        "player1",
        `p1-${deckIndex}-${i}`
      )
    );
    const p2Cards: PlacedCard[] = placedSetupP2.map(({ deckIndex, position }, i) =>
      createPlacedCard(
        deckPlayer2[deckIndex],
        position,
        "player2",
        `p2-${deckIndex}-${i}`
      )
    );
    setPlacedCards([...p1Cards, ...p2Cards]);
    setPhase("playing");
    setTurnOrderIndex(0);
  }, [placedSetupP1, placedSetupP2, deckPlayer1, deckPlayer2]);

  const handlePlaceP1 = useCallback(
    (deckIndex: number, position: Position) => {
      setPlacedSetupP1((prev) => [...prev, { deckIndex, position }]);
    },
    []
  );
  const handleRemoveP1 = useCallback((position: Position) => {
    setPlacedSetupP1((prev) =>
      prev.filter(
        (p) => !(p.position.x === position.x && p.position.y === position.y)
      )
    );
  }, []);
  const handlePlaceP2 = useCallback(
    (deckIndex: number, position: Position) => {
      setPlacedSetupP2((prev) => [...prev, { deckIndex, position }]);
    },
    []
  );
  const handleRemoveP2 = useCallback((position: Position) => {
    setPlacedSetupP2((prev) =>
      prev.filter(
        (p) => !(p.position.x === position.x && p.position.y === position.y)
      )
    );
  }, []);

  const handleReadyP1 = useCallback(() => {
    setReadyP1(true);
    if (readyP2) startGame();
  }, [readyP2, startGame]);
  const handleReadyP2 = useCallback(() => {
    setReadyP2(true);
    if (readyP1) startGame();
  }, [readyP1, startGame]);

  const turnOrder = useMemo(() => getTurnOrder(placedCards), [placedCards]);

  const handleTileClick = useCallback(
    (position: Position) => {
      if (!selectedCard || selectedCard.owner !== currentTurn) return;
      const card = placedCards.find((c) => c.id === selectedCard.id);
      if (!card) return;
      const budget = getMoveBudget(card, weather) - card.moveBudgetUsed;
      const reachable = getReachablePositions(
        board,
        card.position,
        budget,
        placedCards,
        card.owner
      );
      const canGo = reachable.some(
        (p) => p.x === position.x && p.y === position.y
      );
      if (!canGo) return;
      const tile = board[position.y]?.[position.x];
      const cost = tile ? TILE_CONFIG[tile].moveCost : 2;
      if (card.moveBudgetUsed + cost > getMoveBudget(card, weather)) return;

      setPlacedCards((prev) =>
        prev.map((c) =>
          c.id === selectedCard.id
            ? {
                ...c,
                position: { ...position },
                moveBudgetUsed: c.moveBudgetUsed + cost,
              }
            : c
        )
      );
      setSelectedCard(null);

      if (position.x === FLAGS.player2.x && position.y === FLAGS.player2.y) {
        setWinner("player1");
        setPhase("ended");
        onGameEnd?.("player1");
        return;
      }
      if (position.x === FLAGS.player1.x && position.y === FLAGS.player1.y) {
        setWinner("player2");
        setPhase("ended");
        onGameEnd?.("player2");
        return;
      }

      const nextIndex = turnOrderIndex + 1;
      if (nextIndex >= turnOrder.length) {
        setPlacedCards((prev) =>
          prev.map((c) => ({ ...c, moveBudgetUsed: 0 }))
        );
        setTurnOrderIndex(0);
        const firstCard = turnOrder[0];
        setCurrentTurn(firstCard ? firstCard.owner : "player1");
      } else {
        setTurnOrderIndex(nextIndex);
        const next = turnOrder[nextIndex];
        if (next) setCurrentTurn(next.owner);
      }
    },
    [
      selectedCard,
      currentTurn,
      placedCards,
      board,
      weather,
      turnOrderIndex,
      turnOrder,
      onGameEnd,
    ]
  );

  if (phase === "setup") {
    return (
      <div className="space-y-6 p-4">
        <h2 className="text-xl font-bold text-foreground">
          {t.board_game_setup_title as string}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <BoardSetup
            deck={deckPlayer1}
            placedForPlayer={placedSetupP1}
            onPlaceCard={handlePlaceP1}
            onRemovePlacement={handleRemoveP1}
            onReady={handleReadyP1}
            playerLabel="player1"
          />
          <BoardSetup
            deck={deckPlayer2}
            placedForPlayer={placedSetupP2}
            onPlaceCard={handlePlaceP2}
            onRemovePlacement={handleRemoveP2}
            onReady={handleReadyP2}
            playerLabel="player2"
          />
        </div>
      </div>
    );
  }

  if (phase === "ended" && winner) {
    return (
      <div className="p-6 text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          {t.board_game_victory as string}
        </h2>
        <p className="text-lg text-amber-500">
          {winner === "player1"
            ? (t.board_game_winner_p1 as string)
            : (t.board_game_winner_p2 as string)}
        </p>
      </div>
    );
  }

  const weatherConfig = WEATHER_CONFIG[weather];

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden>{weatherConfig.emoji}</span>
          <span>{weatherConfig.label}</span>
        </div>
        <Board
          board={board}
          weather={weather}
          placedCards={placedCards}
          flags={FLAGS}
          currentTurn={currentTurn}
          selectedCard={selectedCard}
          onCardSelect={setSelectedCard}
          onTileClick={handleTileClick}
        />
      </div>
      <aside className="lg:w-64 space-y-4 rounded-xl bg-card border border-border p-4">
        <section>
          <h3 className="font-semibold text-sm text-foreground mb-1">
            {t.board_game_weather as string}
          </h3>
          <p className="text-xs text-muted-foreground">
            {weatherConfig.label} {weatherConfig.emoji}
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-sm text-foreground mb-1">
            {t.board_game_turn_order as string}
          </h3>
          <ol className="text-xs space-y-0.5">
            {turnOrder.map((c, i) => (
              <li
                key={c.id}
                className={
                  i === turnOrderIndex ? "text-amber-500 font-medium" : ""
                }
              >
                {i + 1}. {c.card.model} (SPD {c.card.speed}) —{" "}
                {c.owner === "player1"
                  ? (t.board_setup_player1 as string)
                  : (t.board_setup_player2 as string)}
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3 className="font-semibold text-sm text-foreground mb-1">
            {t.board_game_cards_in_play as string}
          </h3>
          <ul className="text-xs space-y-0.5">
            {placedCards.map((c) => (
              <li key={c.id}>
                {c.card.model} — HP {c.currentHP} @ ({c.position.x},
                {c.position.y})
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
