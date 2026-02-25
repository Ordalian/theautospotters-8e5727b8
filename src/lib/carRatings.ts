// Car condition states
export type CarCondition = "wreck" | "bad" | "good" | "well_kept" | "pristine";

// Photo source types
export type PhotoSource = "none" | "gallery_blurry" | "gallery_clear" | "camera_blurry" | "camera_clear";

// Rarity rating (1-10)
export interface RarityRating {
  level: number; // 1-10
  label: string;
}

// Quality rating (1-8 pistons)
export interface QualityRating {
  level: number; // 1-8
  photoPoints: number; // 0-3
  conditionPoints: number; // 0-5
}

/**
 * Rarity scale 1–10 based on units produced.
 * 10 = mythique (≤100), 9 = légendaire (101–1000), … 1 = ordinaire (≥1 000 001).
 */
export const RARITY_THRESHOLDS_UNITS: { maxUnits: number; level: number }[] = [
  { maxUnits: 100, level: 10 },
  { maxUnits: 1_000, level: 9 },
  { maxUnits: 5_000, level: 8 },
  { maxUnits: 10_000, level: 7 },
  { maxUnits: 25_000, level: 6 },
  { maxUnits: 50_000, level: 5 },
  { maxUnits: 100_000, level: 4 },
  { maxUnits: 500_000, level: 3 },
  { maxUnits: 1_000_000, level: 2 },
  { maxUnits: Infinity, level: 1 },
];

/**
 * Compute rarity level (1–10) from total units produced.
 * 10 = mythique (≤100), 1 = ordinaire (≥1 000 001).
 */
export function getRarityFromUnits(units: number): number {
  const row = RARITY_THRESHOLDS_UNITS.find((t) => units <= t.maxUnits);
  return row ? row.level : 1;
}

/**
 * Default rarity labels (EN). Prefer i18n keys rarity_label_1..10 in UI.
 */
export const RARITY_LABELS: Record<number, string> = {
  1: "Ordinary",
  2: "Common",
  3: "Uncommon",
  4: "Uncommon",
  5: "Rare",
  6: "Superb",
  7: "Magnificent",
  8: "Incredible",
  9: "Legendary",
  10: "Mythic",
};

/**
 * Get rarity label by level (1–10). Use for non-i18n contexts (e.g. AddCar).
 */
export function getRarityLabel(level: number): string {
  const clamped = Math.max(1, Math.min(10, Math.round(level)));
  return RARITY_LABELS[clamped] ?? "Unknown";
}

/**
 * Calculate quality points from photo source
 */
export function getPhotoQualityPoints(source: PhotoSource): number {
  switch (source) {
    case "none":
      return 0;
    case "gallery_blurry":
      return 1;
    case "gallery_clear":
      return 2;
    case "camera_blurry":
      return 2;
    case "camera_clear":
      return 3;
    default:
      return 0;
  }
}

/**
 * Calculate quality points from car condition
 */
export function getConditionQualityPoints(condition: CarCondition): number {
  switch (condition) {
    case "wreck":
      return 1;
    case "bad":
      return 2;
    case "good":
      return 3;
    case "well_kept":
      return 4;
    case "pristine":
      return 5;
    default:
      return 3; // Default to "good"
  }
}

/**
 * Calculate total quality rating (max 8 pistons)
 */
export function calculateQualityRating(
  photoSource: PhotoSource,
  condition: CarCondition
): QualityRating {
  const photoPoints = getPhotoQualityPoints(photoSource);
  const conditionPoints = getConditionQualityPoints(condition);
  const level = Math.min(photoPoints + conditionPoints, 8);

  return {
    level,
    photoPoints,
    conditionPoints,
  };
}

/**
 * Get car condition label
 */
export function getConditionLabel(condition: CarCondition): string {
  const labels: Record<CarCondition, string> = {
    wreck: "Wreck",
    bad: "Bad",
    good: "Good",
    well_kept: "Well Kept",
    pristine: "Pristine",
  };
  return labels[condition];
}

/**
 * Database of car production numbers (approximate)
 * Used when API/units_produced is not available.
 */
interface CarProductionData {
  [brand: string]: {
    [model: string]: {
      productionNumbers?: number;
      yearlyProduction?: number;
      rarity?: number; // Manual override (1-10)
    };
  };
}

const carProductionData: CarProductionData = {
  Ferrari: {
    "*": { rarity: 9 },
    "250 GTO": { productionNumbers: 39, rarity: 10 },
    F40: { productionNumbers: 1315, rarity: 9 },
    LaFerrari: { productionNumbers: 710, rarity: 10 },
  },
  Lamborghini: {
    "*": { rarity: 9 },
    Countach: { productionNumbers: 2049, rarity: 9 },
    Miura: { productionNumbers: 764, rarity: 10 },
  },
  Porsche: {
    "*": { rarity: 6 },
    "911": { yearlyProduction: 35000, rarity: 5 },
    "918 Spyder": { productionNumbers: 918, rarity: 10 },
    Carrera_GT: { productionNumbers: 1270, rarity: 9 },
  },
  Toyota: {
    "*": { rarity: 3 },
    Corolla: { yearlyProduction: 1000000, rarity: 1 },
    Camry: { yearlyProduction: 700000, rarity: 2 },
    "2000GT": { productionNumbers: 351, rarity: 10 },
    Supra: { rarity: 7 },
  },
  Ford: {
    "*": { rarity: 3 },
    "F-150": { yearlyProduction: 900000, rarity: 1 },
    Mustang: { yearlyProduction: 80000, rarity: 4 },
    GT: { productionNumbers: 4038, rarity: 9 },
  },
  McLaren: {
    "*": { rarity: 9 },
    F1: { productionNumbers: 106, rarity: 10 },
    P1: { productionNumbers: 375, rarity: 10 },
  },
  Bugatti: {
    "*": { rarity: 10 },
    Veyron: { productionNumbers: 450, rarity: 10 },
    Chiron: { productionNumbers: 500, rarity: 10 },
  },
};

/**
 * Calculate rarity from total production (used by static data)
 */
function rarityLevelFromProduction(total: number): number {
  return getRarityFromUnits(total);
}

/**
 * Calculate rarity from yearly production (approximate: treat as total for scale)
 */
function rarityLevelFromYearlyProduction(yearly: number): number {
  // Approximate: assume ~10 years production for "total"
  const approxTotal = yearly * 10;
  return getRarityFromUnits(approxTotal);
}

/**
 * Calculate rarity rating based on brand and model (fallback when no units_produced)
 */
export function calculateRarityRating(brand: string, model: string): RarityRating {
  const brandData = carProductionData[brand];

  if (!brandData) {
    return { level: 5, label: getRarityLabel(5) };
  }

  const modelData = brandData[model] || brandData["*"];

  if (modelData.rarity != null) {
    return {
      level: Math.max(1, Math.min(10, modelData.rarity)),
      label: getRarityLabel(modelData.rarity),
    };
  }

  if (modelData.productionNumbers != null) {
    const level = rarityLevelFromProduction(modelData.productionNumbers);
    return { level, label: getRarityLabel(level) };
  }

  if (modelData.yearlyProduction != null) {
    const level = rarityLevelFromYearlyProduction(modelData.yearlyProduction);
    return { level, label: getRarityLabel(level) };
  }

  return { level: 5, label: getRarityLabel(5) };
}
