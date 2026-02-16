// Car condition states
export type CarCondition = "wreck" | "bad" | "good" | "well_kept" | "pristine";

// Photo source types
export type PhotoSource = "none" | "gallery_blurry" | "gallery_clear" | "camera_blurry" | "camera_clear";

// Rarity rating (1-10 wheels)
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
 * This is a simplified version - in production, this would be fetched from an API
 */
interface CarProductionData {
  [brand: string]: {
    [model: string]: {
      productionNumbers?: number; // Total units produced
      yearlyProduction?: number; // Average per year
      rarity?: number; // Manual override (1-10)
    };
  };
}

// Simplified rarity data - can be expanded
const carProductionData: CarProductionData = {
  Ferrari: {
    "*": { rarity: 9 }, // Default for Ferrari
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
  // Add more as needed...
};

/**
 * Calculate rarity rating based on brand and model
 */
export function calculateRarityRating(brand: string, model: string): RarityRating {
  const brandData = carProductionData[brand];
  
  if (!brandData) {
    // Unknown brand - use medium rarity
    return { level: 5, label: "Uncommon" };
  }

  const modelData = brandData[model] || brandData["*"];
  
  if (modelData.rarity) {
    return {
      level: modelData.rarity,
      label: getRarityLabel(modelData.rarity),
    };
  }

  // Calculate based on production numbers
  if (modelData.productionNumbers) {
    const level = calculateRarityFromProduction(modelData.productionNumbers);
    return { level, label: getRarityLabel(level) };
  }

  if (modelData.yearlyProduction) {
    const level = calculateRarityFromYearlyProduction(modelData.yearlyProduction);
    return { level, label: getRarityLabel(level) };
  }

  // Default to medium rarity
  return { level: 5, label: "Uncommon" };
}

/**
 * Calculate rarity from total production numbers
 */
function calculateRarityFromProduction(total: number): number {
  if (total < 100) return 10;
  if (total < 500) return 9;
  if (total < 1000) return 8;
  if (total < 5000) return 7;
  if (total < 10000) return 6;
  if (total < 50000) return 5;
  if (total < 100000) return 4;
  if (total < 500000) return 3;
  if (total < 1000000) return 2;
  return 1;
}

/**
 * Calculate rarity from yearly production
 */
function calculateRarityFromYearlyProduction(yearly: number): number {
  if (yearly < 1000) return 9;
  if (yearly < 5000) return 8;
  if (yearly < 10000) return 7;
  if (yearly < 25000) return 6;
  if (yearly < 50000) return 5;
  if (yearly < 100000) return 4;
  if (yearly < 250000) return 3;
  if (yearly < 500000) return 2;
  return 1;
}

/**
 * Get rarity label
 */
function getRarityLabel(level: number): string {
  const labels: Record<number, string> = {
    1: "Common",
    2: "Common",
    3: "Fairly Common",
    4: "Uncommon",
    5: "Uncommon",
    6: "Rare",
    7: "Very Rare",
    8: "Super Rare",
    9: "Ultra Rare",
    10: "Legendary",
  };
  return labels[level] || "Unknown";
}
