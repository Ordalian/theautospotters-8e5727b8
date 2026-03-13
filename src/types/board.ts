import type { GameCardDef } from "@/data/gameCards";

export interface Position {
  x: number;
  y: number;
}

export interface PlacedCard {
  id: string;
  card: GameCardDef;
  owner: "player1" | "player2";
  position: Position;
  currentHP: number;
  moveBudgetUsed: number;
}
