/**
 * Génération procédurale du plateau 20×20 et météo.
 */

import type { CardArchetype } from "@/data/gameCards";

export type TileType =
  | "road"
  | "city"
  | "countryside"
  | "mountain"
  | "desert"
  | "blocked";

export const TILE_CONFIG: Record<
  TileType,
  {
    moveCost: number;
    emoji: string;
    label: string;
    color: string;
    propagationChance: number;
    propagationMode: "axis" | "around";
  }
> = {
  road: {
    moveCost: 0.5,
    emoji: "🛣️",
    label: "Route",
    color: "bg-gray-600",
    propagationChance: 0.15,
    propagationMode: "axis",
  },
  city: {
    moveCost: 1,
    emoji: "🏙️",
    label: "Ville",
    color: "bg-slate-500",
    propagationChance: 0.2,
    propagationMode: "around",
  },
  countryside: {
    moveCost: 2,
    emoji: "🌿",
    label: "Campagne",
    color: "bg-green-700",
    propagationChance: 0.05,
    propagationMode: "around",
  },
  mountain: {
    moveCost: 3,
    emoji: "⛰️",
    label: "Montagne",
    color: "bg-stone-600",
    propagationChance: 0.1,
    propagationMode: "axis",
  },
  desert: {
    moveCost: 3,
    emoji: "🏜️",
    label: "Désert",
    color: "bg-yellow-700",
    propagationChance: 0.15,
    propagationMode: "around",
  },
  blocked: {
    moveCost: 999,
    emoji: "🚫",
    label: "Bloqué",
    color: "bg-stone-900",
    propagationChance: 0,
    propagationMode: "around",
  },
};

export type WeatherType = "sunny" | "rain" | "snow" | "storm" | "fog";

export const WEATHER_CONFIG: Record<
  WeatherType,
  {
    label: string;
    emoji: string;
    multipliers: Record<CardArchetype, number>;
  }
> = {
  sunny: {
    label: "Soleil",
    emoji: "☀️",
    multipliers: {
      speed: 1.0,
      power: 1.0,
      resilience: 0.8,
      adaptability: 1.0,
    },
  },
  rain: {
    label: "Pluie",
    emoji: "🌧️",
    multipliers: {
      speed: 0.7,
      power: 0.8,
      resilience: 1.0,
      adaptability: 1.2,
    },
  },
  snow: {
    label: "Neige",
    emoji: "🌨️",
    multipliers: {
      speed: 0.5,
      power: 0.6,
      resilience: 1.2,
      adaptability: 0.9,
    },
  },
  storm: {
    label: "Tempête",
    emoji: "🌪️",
    multipliers: {
      speed: 0.6,
      power: 0.7,
      resilience: 1.1,
      adaptability: 1.1,
    },
  },
  fog: {
    label: "Brouillard",
    emoji: "🌫️",
    multipliers: {
      speed: 0.8,
      power: 0.9,
      resilience: 1.0,
      adaptability: 1.3,
    },
  },
};

const BOARD_SIZE = 20;
const PROPAGATION_PASSES = 3;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getNeighborsAxis(
  x: number,
  y: number,
  axis: "horizontal" | "vertical"
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  if (axis === "horizontal") {
    if (x > 0) out.push({ x: x - 1, y });
    if (x < BOARD_SIZE - 1) out.push({ x: x + 1, y });
  } else {
    if (y > 0) out.push({ x, y: y - 1 });
    if (y < BOARD_SIZE - 1) out.push({ x, y: y + 1 });
  }
  return out;
}

function getNeighborsAround(x: number, y: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  if (x > 0) out.push({ x: x - 1, y });
  if (x < BOARD_SIZE - 1) out.push({ x: x + 1, y });
  if (y > 0) out.push({ x, y: y - 1 });
  if (y < BOARD_SIZE - 1) out.push({ x, y: y + 1 });
  return out;
}

function getClusters(
  board: TileType[][],
  tileType: TileType
): { x: number; y: number }[][] {
  const visited = new Set<string>();
  const clusters: { x: number; y: number }[][] = [];

  function key(x: number, y: number) {
    return `${x},${y}`;
  }

  function dfs(x: number, y: number, cluster: { x: number; y: number }[]) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
    if (board[y][x] !== tileType) return;
    const k = key(x, y);
    if (visited.has(k)) return;
    visited.add(k);
    cluster.push({ x, y });
    dfs(x - 1, y, cluster);
    dfs(x + 1, y, cluster);
    dfs(x, y - 1, cluster);
    dfs(x, y + 1, cluster);
  }

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === tileType && !visited.has(key(x, y))) {
        const cluster: { x: number; y: number }[] = [];
        dfs(x, y, cluster);
        clusters.push(cluster);
      }
    }
  }
  return clusters;
}

/**
 * Génère un plateau 20×20.
 * Colonnes 0-1 = zone J1, 18-19 = zone J2 (forcées en road, jamais blocked).
 */
export function generateBoard(): TileType[][] {
  const board: TileType[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): TileType => "countryside")
  );

  type SeedType = Exclude<TileType, "blocked" | "countryside">;
  const seedTypes: SeedType[] = ["road", "city", "mountain", "desert"];

  const seeds: { type: SeedType; x: number; y: number }[] = [];
  for (const type of seedTypes) {
    const count = randomInt(3, 5);
    for (let i = 0; i < count; i++) {
      seeds.push({
        type,
        x: randomInt(0, BOARD_SIZE - 1),
        y: randomInt(0, BOARD_SIZE - 1),
      });
    }
  }

  for (const { type, x, y } of seeds) {
    board[y][x] = type;
  }

  for (let pass = 0; pass < PROPAGATION_PASSES; pass++) {
    const next = board.map((row) => [...row]);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const tile = board[y][x];
        if (tile === "countryside" || tile === "blocked") continue;
        const config = TILE_CONFIG[tile];
        const neighbors =
          config.propagationMode === "axis"
            ? getNeighborsAxis(
                x,
                y,
                Math.random() < 0.5 ? "horizontal" : "vertical"
              )
            : getNeighborsAround(x, y);
        for (const n of neighbors) {
          if (
            board[n.y][n.x] === "countryside" &&
            Math.random() < config.propagationChance
          ) {
            next[n.y][n.x] = tile;
          }
        }
      }
    }
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        board[y][x] = next[y][x];
      }
    }
  }

  for (let y = 0; y < BOARD_SIZE; y++) {
    board[y][0] = "road";
    board[y][1] = "road";
    board[y][18] = "road";
    board[y][19] = "road";
  }

  const mountainClusters = getClusters(board, "mountain");
  for (const cluster of mountainClusters) {
    if (cluster.length <= 4) continue;
    for (const { x, y } of cluster) {
      if (Math.random() < 0.1) board[y][x] = "blocked";
    }
  }

  const riverCount = randomInt(1, 2);
  for (let r = 0; r < riverCount; r++) {
    const row = randomInt(0, BOARD_SIZE - 1);
    const start = randomInt(2, BOARD_SIZE - 10);
    const length = randomInt(8, 15);
    for (let x = start; x < Math.min(BOARD_SIZE - 2, start + length); x++) {
      if (x >= 2 && x <= 17) board[row][x] = "blocked";
    }
  }

  const cityClusters = getClusters(board, "city");
  for (const cluster of cityClusters) {
    for (const { x, y } of cluster) {
      if (Math.random() < 0.05) board[y][x] = "blocked";
    }
  }

  for (let y = 0; y < BOARD_SIZE; y++) {
    board[y][0] = "road";
    board[y][1] = "road";
    board[y][18] = "road";
    board[y][19] = "road";
  }

  return board;
}

const WEATHER_TYPES: WeatherType[] = [
  "sunny",
  "rain",
  "snow",
  "storm",
  "fog",
];

export function generateWeather(): WeatherType {
  return WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
}
