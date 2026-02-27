/**
 * Achievements: 10 levels each, thresholds per level.
 * Level 1 = first threshold reached, level 10 = last.
 * Each level grants XP when reached (cumulative in total).
 */

const RARITY_HUNTER_IDS = ["rarity_hunter_5", "rarity_hunter_6", "rarity_hunter_7", "rarity_hunter_8", "rarity_hunter_9", "rarity_hunter_10"] as const;
export const ACHIEVEMENT_IDS = ["spotter", "globe_trotter", ...RARITY_HUNTER_IDS, "brand_collector"] as const;
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
  brand_collector: "hexagon",
};

/** XP granted when reaching each level (1→100, 2→200, …, 10→5000). */
export const ACHIEVEMENT_XP_REWARDS: [number, number, number, number, number, number, number, number, number, number] = [
  100, 200, 400, 800, 1500, 2000, 2500, 3000, 3500, 5000,
];

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
  brand_collector: {
    id: "brand_collector",
    labelKey: "achievement_brand_collector",
    thresholds: [3, 5, 10, 15, 20, 30, 40, 50, 70, 100],
  },
};

export interface AchievementStats {
  spotCount: number;
  distinctLocations: number;
  /** Count of cars with rarity_rating >= 5 (rares) */
  rarityCountMin5: number;
  rarityCountMin6: number;
  rarityCountMin7: number;
  rarityCountMin8: number;
  rarityCountMin9: number;
  rarityCountMin10: number;
  distinctBrands: number;
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
      return stats.rarityCountMin5;
    case "rarity_hunter_6":
      return stats.rarityCountMin6;
    case "rarity_hunter_7":
      return stats.rarityCountMin7;
    case "rarity_hunter_8":
      return stats.rarityCountMin8;
    case "rarity_hunter_9":
      return stats.rarityCountMin9;
    case "rarity_hunter_10":
      return stats.rarityCountMin10;
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
