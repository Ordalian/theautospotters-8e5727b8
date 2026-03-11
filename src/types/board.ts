/**
 * Types pour le mode plateau stratégique 1v1.
 */

import type { GameCardDef } from "@/data/gameCards";
import type { CardCondition } from "@/data/gameCards";

export interface Position {
  x: number;
  y: number;
}

/** Carte posée sur le plateau (référence vers une définition + état de jeu). */
export interface PlacedCard {
  id: string;
  card: GameCardDef & { condition: CardCondition };
  owner: "player1" | "player2";
  position: Position;
  currentHP: number;
  moveBudgetUsed: number;
}
