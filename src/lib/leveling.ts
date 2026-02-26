/**
 * Leveling system: levels 0–100.
 * Level 1 = 1000 XP total, level 2 = 1000+2000 = 3000, level 3 = 6000, …
 * So total XP for level n = 1000 * (1 + 2 + … + n) = 1000 * n * (n + 1) / 2.
 */

const XP_PER_LEVEL_BASE = 1000;

/** Total XP required to reach level n (so that at exactly this XP you are level n). */
export function getXpRequiredForLevel(level: number): number {
  const n = Math.max(0, Math.min(100, Math.floor(level)));
  return n * (n + 1) * XP_PER_LEVEL_BASE / 2;
}

/** Current level (0–100) from total XP. */
export function getLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  if (xp <= 0) return 0;
  // Solve n(n+1)/2 * 1000 <= xp  =>  n^2 + n - 2*xp/1000 <= 0  =>  n <= (-1 + sqrt(1+8*xp/1000))/2
  const n = Math.floor((Math.sqrt(1 + (8 * xp) / XP_PER_LEVEL_BASE) - 1) / 2);
  return Math.min(100, n);
}

export interface LevelProgress {
  level: number;
  xpInCurrentLevel: number;
  xpRequiredForCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpToNextLevel: number;
  progressFraction: number;
}

/** Get level and progress within current level. At level 100, progress is 1 and xpToNextLevel is 0. */
export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = getLevelFromXp(xp);
  const xpAtLevelStart = getXpRequiredForLevel(level);
  const xpAtNextLevel = level >= 100 ? xpAtLevelStart : getXpRequiredForLevel(level + 1);
  const xpInCurrentLevel = xp - xpAtLevelStart;
  const xpRequiredForCurrentLevel = xpAtNextLevel - xpAtLevelStart;
  const xpToNextLevel = Math.max(0, xpAtNextLevel - xp);
  const progressFraction = level >= 100 ? 1 : xpRequiredForCurrentLevel > 0 ? xpInCurrentLevel / xpRequiredForCurrentLevel : 0;

  return {
    level,
    xpInCurrentLevel,
    xpRequiredForCurrentLevel,
    xpRequiredForNextLevel: xpAtNextLevel,
    xpToNextLevel,
    progressFraction,
  };
}
