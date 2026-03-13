import { useEffect, useRef, useMemo } from "react";
import Phaser from "phaser";
import type { TileType, WeatherType } from "@/lib/boardGenerator";
import type { PlacedCard, Position } from "@/types/board";
import { getMoveBudget, getReachablePositions } from "@/lib/boardMovement";
import { BoardScene } from "./scenes/BoardScene";

export interface PhaserBoardProps {
  board: TileType[][];
  weather: WeatherType;
  placedCards: PlacedCard[];
  flags: { player1: Position; player2: Position };
  currentTurn: "player1" | "player2";
  selectedCard: PlacedCard | null;
  onCardSelect: (card: PlacedCard) => void;
  onTileClick: (position: Position) => void;
}

export function PhaserBoard({
  board,
  weather,
  placedCards,
  flags,
  currentTurn,
  selectedCard,
  onCardSelect,
  onTileClick,
}: PhaserBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  const callbacksRef = useRef({ onCardSelect, onTileClick });
  callbacksRef.current = { onCardSelect, onTileClick };

  const reachableSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedCard && selectedCard.owner === currentTurn) {
      const budget = getMoveBudget(selectedCard, weather) - selectedCard.moveBudgetUsed;
      const reachable = getReachablePositions(board, selectedCard.position, budget, placedCards, selectedCard.owner);
      for (const p of reachable) set.add(`${p.x},${p.y}`);
    }
    return set;
  }, [selectedCard, currentTurn, weather, board, placedCards]);

  // Store latest state for scene init
  const stateRef = useRef({ board, placedCards, selectedCard, reachableSet, flags, currentTurn });
  stateRef.current = { board, placedCards, selectedCard, reachableSet, flags, currentTurn };

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: 500,
      transparent: true,
      scene: [BoardScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });
    gameRef.current = game;

    // Poll until scene is ready
    const poll = setInterval(() => {
      const s = game.scene.getScene("BoardScene") as BoardScene | null;
      if (s && s.scene.isActive()) {
        clearInterval(poll);
        sceneRef.current = s;

        // Pass initial state
        s.setInitialState(stateRef.current);

        // Bind events
        s.events.on("tileClicked", (pos: Position) => {
          callbacksRef.current.onTileClick(pos);
        });
        s.events.on("cardSelected", (card: PlacedCard) => {
          callbacksRef.current.onCardSelect(card);
        });
      }
    }, 100);

    return () => {
      clearInterval(poll);
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state to scene
  useEffect(() => {
    sceneRef.current?.updateState({
      board, placedCards, selectedCard, reachableSet, flags, currentTurn,
    });
  }, [board, placedCards, selectedCard, reachableSet, flags, currentTurn]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-border/50 bg-gradient-to-br from-muted/40 to-muted/20 shadow-inner overflow-hidden"
      style={{ minHeight: 500 }}
    />
  );
}
