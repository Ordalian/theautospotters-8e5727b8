/**
 * Logique de déplacement, points de cartes et ordre de tour (plateau stratégique).
 */

import type { TileType } from "@/lib/boardGenerator";
import { TILE_CONFIG } from "@/lib/boardGenerator";
import type { PlacedCard, Position } from "@/types/board";
import type { CardRarity, CardCondition } from "@/data/gameCards";
import { WEATHER_CONFIG } from "@/lib/boardGenerator";
import type { WeatherType } from "@/lib/boardGenerator";

/** Modificateurs de condition pour le plateau (spec: budget mouvement). */
const BOARD_CONDITION_MODIFIERS: Record<CardCondition, number> = {
  destroyed: 0,
  damaged: 0.5,
  average: 0.75,
  good: 1.0,
  perfect: 1.5,
};

export function getCardPoints(
  rarity: CardRarity,
  condition: CardCondition
): number {
  const base: Record<CardRarity, number> = {
    common: 1,
    uncommon: 2,
    rare: 4,
    mythic: 8,
  };
  const mod: Record<CardCondition, number> = {
    damaged: 0.5,
    average: 0.75,
    good: 1.0,
    perfect: 1.5,
  };
  return Math.round(base[rarity] * mod[condition]);
}

export function getMoveBudget(
  card: PlacedCard,
  weather: WeatherType
): number {
  const condition = card.card.condition ?? "good";
  const effectiveSpeed =
    card.card.speed * BOARD_CONDITION_MODIFIERS[condition];
  const weatherMultiplier =
    WEATHER_CONFIG[weather].multipliers[card.card.archetype];
  return Math.floor(effectiveSpeed * weatherMultiplier);
}

export function getTurnOrder(cards: PlacedCard[]): PlacedCard[] {
  const condition = (c: PlacedCard) => c.card.condition ?? "good";
  const withSpeed = cards.map((c) => ({
    card: c,
    effectiveSpeed:
      c.card.speed * BOARD_CONDITION_MODIFIERS[condition(c)] +
      Math.random() * 0.001,
  }));
  withSpeed.sort((a, b) => b.effectiveSpeed - a.effectiveSpeed);
  return withSpeed.map((x) => x.card);
}

export function canMoveTo(
  board: TileType[][],
  from: Position,
  to: Position,
  placedCards: PlacedCard[],
  movingCardOwner: "player1" | "player2"
): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx + dy !== 1) return false;

  if (to.y < 0 || to.y >= board.length || to.x < 0 || to.x >= board[0].length)
    return false;

  const tile = board[to.y][to.x];
  if (tile === "blocked") return false;

  const occupant = placedCards.find(
    (c) => c.position.x === to.x && c.position.y === to.y
  );
  if (occupant && occupant.owner !== movingCardOwner) return false;

  return true;
}

const BOARD_SIZE = 8;

export function getReachablePositions(
  board: TileType[][],
  from: Position,
  budget: number,
  placedCards: PlacedCard[],
  movingCardOwner: "player1" | "player2"
): Position[] {
  const result: Position[] = [];
  const visited = new Set<string>();
  const key = (p: Position) => `${p.x},${p.y}`;

  function dfs(p: Position, remaining: number) {
    const k = key(p);
    if (remaining < 0 || visited.has(k)) return;
    visited.add(k);
    if (p.x !== from.x || p.y !== from.y) result.push({ ...p });

    const neighbors: Position[] = [
      { x: p.x - 1, y: p.y },
      { x: p.x + 1, y: p.y },
      { x: p.x, y: p.y - 1 },
      { x: p.x, y: p.y + 1 },
    ];
    for (const n of neighbors) {
      if (n.x < 0 || n.x >= BOARD_SIZE || n.y < 0 || n.y >= BOARD_SIZE)
        continue;
      if (board[n.y][n.x] === "blocked") continue;
      const occupant = placedCards.find(
        (c) => c.position.x === n.x && c.position.y === n.y
      );
      if (occupant && occupant.owner !== movingCardOwner) continue;
      const cost = TILE_CONFIG[board[n.y][n.x]].moveCost;
      if (remaining >= cost) dfs(n, remaining - cost);
    }
  }

  dfs(from, budget);
  return result;
}
