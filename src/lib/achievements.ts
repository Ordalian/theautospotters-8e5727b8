/**
 * Achievements: 10 levels each, thresholds per level.
 * Level 1 = first threshold reached, level 10 = last.
 * Each level grants XP when reached (cumulative in total).
 */

export const RARITY_HUNTER_IDS = [
  "rarity_hunter_5",
  "rarity_hunter_6",
  "rarity_hunter_7",
  "rarity_hunter_8",
  "rarity_hunter_9",
  "rarity_hunter_10",
] as const;
export const MUSE_ACHIEVEMENT_IDS = ["muse_of_history"] as const;
export const ACHIEVEMENT_IDS = [
  "spotter",
  "globe_trotter",
  ...RARITY_HUNTER_IDS,
  "big_game",
  ...MUSE_ACHIEVEMENT_IDS,
  "brand_collector",
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

/** Shape of the emblem for each achievement type */
export type EmblemShape = "shield" | "globe" | "diamond" | "hexagon";

const RARITY_THRESHOLDS: [number, number, number, number, number, number, number, number, number, number] = [
  1, 3, 10, 25, 50, 100, 200, 500, 1000, 2000,
];

export const ACHIEVEMENT_SHAPES: Record<AchievementId, EmblemShape> = {
  spotter: "shield",
  globe_trotter: "globe",
  rarity_hunter_5: "diamond",
  rarity_hunter_6: "diamond",
  rarity_hunter_7: "diamond",
  rarity_hunter_8: "diamond",
  rarity_hunter_9: "diamond",
  rarity_hunter_10: "diamond",
  big_game: "shield",
  muse_of_history: "globe",
  brand_collector: "hexagon",
};

/** XP granted when reaching each level (1→100, 2→200, …, 10→5000). */
export const ACHIEVEMENT_XP_REWARDS: [number, number, number, number, number, number, number, number, number, number] =
  [100, 200, 400, 800, 1500, 2000, 2500, 3000, 3500, 5000];

export interface AchievementDef {
  id: AchievementId;
  /** i18n key for title (e.g. achievement_spotter) */
  labelKey: string;
  /** Thresholds for levels 1..10 (value >= threshold unlocks that level) */
  thresholds: [number, number, number, number, number, number, number, number, number, number];
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  spotter: {
    id: "spotter",
    labelKey: "achievement_spotter",
    thresholds: [5, 10, 50, 100, 500, 1000, 2000, 5000, 10000, 20000],
  },
  globe_trotter: {
    id: "globe_trotter",
    labelKey: "achievement_globe_trotter",
    thresholds: [2, 5, 10, 20, 35, 50, 75, 100, 150, 180],
  },
  rarity_hunter_5: {
    id: "rarity_hunter_5",
    labelKey: "achievement_rarity_hunter_5",
    thresholds: RARITY_THRESHOLDS,
  },
  rarity_hunter_6: {
    id: "rarity_hunter_6",
    labelKey: "achievement_rarity_hunter_6",
    thresholds: RARITY_THRESHOLDS,
  },
  rarity_hunter_7: {
    id: "rarity_hunter_7",
    labelKey: "achievement_rarity_hunter_7",
    thresholds: RARITY_THRESHOLDS,
  },
  rarity_hunter_8: {
    id: "rarity_hunter_8",
    labelKey: "achievement_rarity_hunter_8",
    thresholds: RARITY_THRESHOLDS,
  },
  rarity_hunter_9: {
    id: "rarity_hunter_9",
    labelKey: "achievement_rarity_hunter_9",
    thresholds: RARITY_THRESHOLDS,
  },
  rarity_hunter_10: {
    id: "rarity_hunter_10",
    labelKey: "achievement_rarity_hunter_10",
    thresholds: RARITY_THRESHOLDS,
  },
  big_game: {
    id: "big_game",
    labelKey: "achievement_big_game",
    thresholds: [1, 2, 5, 10, 15, 25, 35, 45, 55, 60],
  },
  muse_of_history: {
    id: "muse_of_history",
    labelKey: "achievement_muse_of_history",
    thresholds: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  brand_collector: {
    id: "brand_collector",
    labelKey: "achievement_brand_collector",
    thresholds: [3, 5, 10, 15, 20, 30, 40, 50, 70, 100],
  },
};

export interface AchievementStats {
  spotCount: number;
  distinctLocations: number;
  /** Count of cars with rarity_rating === 5, 6, … 10 (exact rarity only) */
  rarityCountExact5: number;
  rarityCountExact6: number;
  rarityCountExact7: number;
  rarityCountExact8: number;
  rarityCountExact9: number;
  rarityCountExact10: number;
  distinctBrands: number;
  /** Number of distinct Renault Clio generations (I–VI) spotted. Max 6. */
  clioGenerationsSpotted: number;
}

/** Current level 0-10 for an achievement (0 = none unlocked). */
export function getAchievementLevel(achievementId: AchievementId, value: number): number {
  const def = ACHIEVEMENTS[achievementId];
  if (!def) return 0;
  let level = 0;
  for (let i = 0; i < 10; i++) {
    if (value >= def.thresholds[i]) level = i + 1;
  }
  return level;
}

/** Progress within current level: 0..1 (1 = reached current level's threshold). */
export function getAchievementProgressInLevel(achievementId: AchievementId, value: number): number {
  const def = ACHIEVEMENTS[achievementId];
  if (!def) return 0;
  const level = getAchievementLevel(achievementId, value);
  if (level >= 10) return 1;
  const currentThreshold = def.thresholds[level];
  const prevThreshold = level === 0 ? 0 : def.thresholds[level - 1];
  const span = currentThreshold - prevThreshold;
  if (span <= 0) return 1;
  return Math.min(1, (value - prevThreshold) / span);
}

/** Sum of levels (1–10) across all 6 rarity hunter achievements. Max 60. */
function getBigGameValue(stats: AchievementStats): number {
  let sum = 0;
  for (const id of RARITY_HUNTER_IDS) {
    const value = getAchievementValue(id, stats);
    sum += getAchievementLevel(id, value);
  }
  return sum;
}

/** Next threshold to reach (for display). */
export function getNextThreshold(achievementId: AchievementId, value: number): number | null {
  const def = ACHIEVEMENTS[achievementId];
  if (!def) return null;
  const level = getAchievementLevel(achievementId, value);
  if (level >= 10) return null;
  return def.thresholds[level];
}

export function getAchievementValue(achievementId: AchievementId, stats: AchievementStats): number {
  switch (achievementId) {
    case "spotter":
      return stats.spotCount;
    case "globe_trotter":
      return stats.distinctLocations;
    case "rarity_hunter_5":
      return stats.rarityCountExact5;
    case "rarity_hunter_6":
      return stats.rarityCountExact6;
    case "rarity_hunter_7":
      return stats.rarityCountExact7;
    case "rarity_hunter_8":
      return stats.rarityCountExact8;
    case "rarity_hunter_9":
      return stats.rarityCountExact9;
    case "rarity_hunter_10":
      return stats.rarityCountExact10;
    case "big_game":
      return getBigGameValue(stats);
    case "muse_of_history":
      return stats.clioGenerationsSpotted;
    case "brand_collector":
      return stats.distinctBrands;
    default:
      return 0;
  }
}

/** Total XP earned from an achievement up to the given level (sum of rewards for levels 1..level). */
export function getAchievementXpForLevel(level: number): number {
  if (level <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < Math.min(level, 10); i++) {
    sum += ACHIEVEMENT_XP_REWARDS[i];
  }
  return sum;
}

/** Total XP from all achievements given current stats. */
export function getTotalAchievementXp(stats: AchievementStats): number {
  let total = 0;
  for (const id of ACHIEVEMENT_IDS) {
    const value = getAchievementValue(id, stats);
    const level = getAchievementLevel(id, value);
    total += getAchievementXpForLevel(level);
  }
  return total;
}
