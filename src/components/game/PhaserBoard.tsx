import { useEffect, useRef, useMemo, useCallback } from "react";
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

  // Keep callbacks fresh
  callbacksRef.current = { onCardSelect, onTileClick };

  // Compute reachable set
  const reachableSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedCard && selectedCard.owner === currentTurn) {
      const budget = getMoveBudget(selectedCard, weather) - selectedCard.moveBudgetUsed;
      const reachable = getReachablePositions(
        board,
        selectedCard.position,
        budget,
        placedCards,
        selectedCard.owner
      );
      for (const p of reachable) {
        set.add(`${p.x},${p.y}`);
      }
    }
    return set;
  }, [selectedCard, currentTurn, weather, board, placedCards]);

  // Initialize Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new BoardScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: 500,
      transparent: true,
      scene: {
        key: "BoardScene",
        preload: scene.preload.bind(scene),
        create: scene.create.bind(scene),
        init: scene.init.bind(scene),
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        mouse: { preventDefaultWheel: false },
      },
    });

    // We need to instantiate the scene properly
    game.destroy(true);

    // Recreate with proper scene class
    const game2 = new Phaser.Game({
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
      input: {
        mouse: { preventDefaultWheel: false },
      },
    });

    gameRef.current = game2;

    // Wait for scene to be ready, then pass initial state and bind events
    const checkScene = () => {
      const boardScene = game2.scene.getScene("BoardScene") as BoardScene;
      if (boardScene && boardScene.scene.isActive()) {
        sceneRef.current = boardScene;
        boardScene.init({
          initialState: {
            board,
            placedCards,
            selectedCard,
            reachableSet,
            flags,
            currentTurn,
          },
        });

        // Listen for events from Phaser
        boardScene.events.on("tileClicked", (pos: Position) => {
          const card = placedCards.find(c => c.position.x === pos.x && c.position.y === pos.y);
          if (card) {
            callbacksRef.current.onCardSelect(card);
          } else {
            callbacksRef.current.onTileClick(pos);
          }
        });

        boardScene.events.on("cardSelected", (card: PlacedCard) => {
          callbacksRef.current.onCardSelect(card);
        });
      } else {
        setTimeout(checkScene, 100);
      }
    };
    setTimeout(checkScene, 200);

    return () => {
      game2.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state to Phaser scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateState({
        board,
        placedCards,
        selectedCard,
        reachableSet,
        flags,
        currentTurn,
      });
    }
  }, [board, placedCards, selectedCard, reachableSet, flags, currentTurn]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-border/50 bg-gradient-to-br from-muted/40 to-muted/20 shadow-inner overflow-hidden"
      style={{ minHeight: 500 }}
    />
  );
}
