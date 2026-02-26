/**
 * Achievements: 10 levels each, thresholds per level.
 * Level 1 = first threshold reached, level 10 = last.
 * Each level grants XP when reached (cumulative in total).
 */

export const ACHIEVEMENT_IDS = ["spotter"] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

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
};

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

export function getAchievementValue(achievementId: AchievementId, stats: { spotCount: number }): number {
  switch (achievementId) {
    case "spotter":
      return stats.spotCount;
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
export function getTotalAchievementXp(stats: { spotCount: number }): number {
  let total = 0;
  for (const id of ACHIEVEMENT_IDS) {
    const value = getAchievementValue(id, stats);
    const level = getAchievementLevel(id, value);
    total += getAchievementXpForLevel(level);
  }
  return total;
}
