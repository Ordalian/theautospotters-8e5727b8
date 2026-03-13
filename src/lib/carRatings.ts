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
  // --- Hypercars / Exotics ---
  Ferrari: {
    "*": { rarity: 9 },
    "250 GTO": { productionNumbers: 39, rarity: 10 },
    F40: { productionNumbers: 1315, rarity: 9 },
    F50: { productionNumbers: 349, rarity: 10 },
    Enzo: { productionNumbers: 400, rarity: 10 },
    LaFerrari: { productionNumbers: 710, rarity: 10 },
    "Daytona SP3": { productionNumbers: 599, rarity: 10 },
    "SF90 Stradale": { rarity: 8 },
    "296 GTB": { rarity: 8 },
    "488 GTB": { rarity: 8 },
    "458 Italia": { rarity: 8 },
    California: { rarity: 7 },
    Roma: { rarity: 8 },
    Purosangue: { rarity: 8 },
    "812 Superfast": { rarity: 8 },
    Testarossa: { rarity: 9 },
    "12Cilindri": { rarity: 8 },
  },
  Lamborghini: {
    "*": { rarity: 9 },
    Miura: { productionNumbers: 764, rarity: 10 },
    Countach: { productionNumbers: 2049, rarity: 9 },
    Diablo: { productionNumbers: 2884, rarity: 9 },
    "Murciélago": { rarity: 9 },
    Gallardo: { productionNumbers: 14022, rarity: 7 },
    Aventador: { rarity: 8 },
    "Huracán": { rarity: 8 },
    Revuelto: { rarity: 9 },
    Urus: { rarity: 7 },
    Temerario: { rarity: 9 },
  },
  Bugatti: {
    "*": { rarity: 10 },
    Veyron: { productionNumbers: 450, rarity: 10 },
    Chiron: { productionNumbers: 500, rarity: 10 },
    Divo: { productionNumbers: 40, rarity: 10 },
    Centodieci: { productionNumbers: 10, rarity: 10 },
    Bolide: { productionNumbers: 40, rarity: 10 },
    Tourbillon: { rarity: 10 },
  },
  McLaren: {
    "*": { rarity: 9 },
    F1: { productionNumbers: 106, rarity: 10 },
    P1: { productionNumbers: 375, rarity: 10 },
    Senna: { productionNumbers: 500, rarity: 10 },
    Speedtail: { productionNumbers: 106, rarity: 10 },
    Elva: { productionNumbers: 149, rarity: 10 },
    W1: { rarity: 10 },
    "720S": { rarity: 8 },
    "750S": { rarity: 8 },
    Artura: { rarity: 8 },
  },
  Pagani: {
    "*": { rarity: 10 },
    Zonda: { productionNumbers: 140, rarity: 10 },
    Huayra: { productionNumbers: 100, rarity: 10 },
    Utopia: { productionNumbers: 99, rarity: 10 },
  },
  Koenigsegg: {
    "*": { rarity: 10 },
    "One:1": { productionNumbers: 7, rarity: 10 },
    "Agera RS": { productionNumbers: 25, rarity: 10 },
    Regera: { productionNumbers: 80, rarity: 10 },
    Jesko: { productionNumbers: 125, rarity: 10 },
    Gemera: { productionNumbers: 300, rarity: 10 },
    CC850: { productionNumbers: 70, rarity: 10 },
  },
  Rimac: {
    "*": { rarity: 10 },
    "Concept One": { productionNumbers: 8, rarity: 10 },
    Nevera: { productionNumbers: 150, rarity: 10 },
  },
  SSC: {
    "*": { rarity: 10 },
    "Ultimate Aero": { productionNumbers: 24, rarity: 10 },
    Tuatara: { productionNumbers: 100, rarity: 10 },
  },
  "Gordon Murray": {
    "*": { rarity: 10 },
    "T.50": { productionNumbers: 100, rarity: 10 },
    "T.33": { productionNumbers: 100, rarity: 10 },
  },
  Hennessey: {
    "*": { rarity: 10 },
    "Venom GT": { productionNumbers: 16, rarity: 10 },
    "Venom F5": { productionNumbers: 24, rarity: 10 },
  },
  Pininfarina: {
    "*": { rarity: 10 },
    Battista: { productionNumbers: 150, rarity: 10 },
  },

  // --- Premium Sport ---
  Porsche: {
    "*": { rarity: 6 },
    "911": { rarity: 5 },
    "911 Turbo": { rarity: 7 },
    "911 GT2": { rarity: 8 },
    "911 Carrera": { rarity: 5 },
    GT3: { rarity: 7 },
    "GT2 RS": { rarity: 9 },
    "Cayman GT4": { rarity: 7 },
    "918 Spyder": { productionNumbers: 918, rarity: 10 },
    "Carrera GT": { productionNumbers: 1270, rarity: 9 },
    Cayenne: { rarity: 4 },
    Macan: { rarity: 4 },
    Panamera: { rarity: 5 },
    Taycan: { rarity: 5 },
    "718 Cayman": { rarity: 6 },
    "718 Boxster": { rarity: 6 },
    "Boxster Spyder": { rarity: 7 },
    "914": { rarity: 7 },
    "924": { rarity: 6 },
    "928": { rarity: 7 },
    "944": { rarity: 6 },
    "968": { rarity: 7 },
  },
  "Aston Martin": {
    "*": { rarity: 8 },
    Valkyrie: { productionNumbers: 150, rarity: 10 },
    Vanquish: { rarity: 8 },
    "DBS Superleggera": { rarity: 8 },
    DB11: { rarity: 8 },
    DB12: { rarity: 8 },
    Vantage: { rarity: 7 },
    DBX: { rarity: 7 },
  },
  Lotus: {
    "*": { rarity: 8 },
    Evija: { productionNumbers: 130, rarity: 10 },
    Exige: { rarity: 8 },
    Elise: { rarity: 7 },
    Emira: { rarity: 7 },
    Eletre: { rarity: 7 },
  },
  Maserati: {
    "*": { rarity: 7 },
    MC20: { rarity: 8 },
    GranTurismo: { rarity: 7 },
    Quattroporte: { rarity: 7 },
    Ghibli: { rarity: 6 },
    Levante: { rarity: 6 },
    Grecale: { rarity: 6 },
  },
  "Rolls-Royce": {
    "*": { rarity: 9 },
    Phantom: { rarity: 9 },
    Ghost: { rarity: 8 },
    Wraith: { rarity: 8 },
    Cullinan: { rarity: 8 },
    Spectre: { rarity: 9 },
    Dawn: { rarity: 8 },
  },
  Bentley: {
    "*": { rarity: 8 },
    Bacalar: { productionNumbers: 12, rarity: 10 },
    Batur: { productionNumbers: 18, rarity: 10 },
    "Continental GT": { rarity: 7 },
    "Flying Spur": { rarity: 7 },
    Bentayga: { rarity: 7 },
  },
  Alpine: {
    "*": { rarity: 7 },
    A110: { rarity: 7 },
    A310: { rarity: 9 },
    A610: { rarity: 9 },
    A424: { rarity: 8 },
    A442: { productionNumbers: 4, rarity: 10 },
  },

  // --- Premium Allemand ---
  BMW: {
    "*": { rarity: 4 },
    M1: { productionNumbers: 453, rarity: 10 },
    Z8: { productionNumbers: 5703, rarity: 8 },
    "1M": { productionNumbers: 6309, rarity: 8 },
    M2: { rarity: 6 },
    M3: { rarity: 6 },
    M4: { rarity: 6 },
    M5: { rarity: 6 },
    M8: { rarity: 7 },
    M6: { rarity: 7 },
    XM: { rarity: 7 },
    Z3: { rarity: 5 },
    Z4: { rarity: 5 },
    "8 Series": { rarity: 6 },
    "1 Series": { rarity: 2 },
    "2 Series": { rarity: 3 },
    "3 Series": { rarity: 2 },
    "4 Series": { rarity: 3 },
    "5 Series": { rarity: 3 },
    "7 Series": { rarity: 5 },
    X1: { rarity: 2 },
    X3: { rarity: 3 },
    X5: { rarity: 4 },
    i3: { rarity: 4 },
  },
  Audi: {
    "*": { rarity: 4 },
    R8: { rarity: 7 },
    "RS e-tron GT": { rarity: 7 },
    "e-tron GT": { rarity: 6 },
    RS3: { rarity: 6 },
    RS4: { rarity: 6 },
    RS5: { rarity: 6 },
    RS6: { rarity: 7 },
    RS7: { rarity: 7 },
    "RS Q8": { rarity: 7 },
    "TT RS": { rarity: 6 },
    TT: { rarity: 5 },
    A1: { rarity: 2 },
    A3: { rarity: 2 },
    A4: { rarity: 2 },
    A5: { rarity: 3 },
    A6: { rarity: 3 },
    A7: { rarity: 4 },
    A8: { rarity: 5 },
    Q3: { rarity: 3 },
    Q5: { rarity: 3 },
    Q7: { rarity: 4 },
    Q8: { rarity: 5 },
    S3: { rarity: 5 },
    S4: { rarity: 5 },
    S5: { rarity: 5 },
    S6: { rarity: 5 },
    S7: { rarity: 5 },
    S8: { rarity: 6 },
  },
  "Mercedes-Benz": {
    "*": { rarity: 4 },
    "AMG One": { productionNumbers: 275, rarity: 10 },
    "CLK GTR": { productionNumbers: 26, rarity: 10 },
    "SLR McLaren": { productionNumbers: 2157, rarity: 9 },
    "AMG GT": { rarity: 7 },
    "AMG GT 4-Door": { rarity: 7 },
    SL: { rarity: 6 },
    "AMG SL": { rarity: 7 },
    "G-Class": { rarity: 6 },
    "S-Class": { rarity: 5 },
    CL: { rarity: 6 },
    "CLS Shooting Brake": { rarity: 6 },
    "A-Class": { rarity: 2 },
    "B-Class": { rarity: 2 },
    "C-Class": { rarity: 2 },
    "E-Class": { rarity: 3 },
    CLA: { rarity: 3 },
    CLS: { rarity: 5 },
    GLA: { rarity: 3 },
    GLC: { rarity: 3 },
    GLE: { rarity: 4 },
    GLS: { rarity: 5 },
    "V-Class": { rarity: 4 },
    "190": { rarity: 5 },
    SLK: { rarity: 5 },
    SLC: { rarity: 5 },
    "R-Class": { rarity: 6 },
  },

  // --- Japonais Courant ---
  Toyota: {
    "*": { rarity: 2 },
    "2000GT": { productionNumbers: 351, rarity: 10 },
    Century: { rarity: 9 },
    Supra: { rarity: 7 },
    "GR Yaris": { rarity: 6 },
    "GR86": { rarity: 6 },
    "GR Corolla": { rarity: 7 },
    "Land Cruiser": { rarity: 5 },
    MR2: { rarity: 6 },
    Celica: { rarity: 5 },
    GT86: { rarity: 5 },
    Corolla: { rarity: 1 },
    Camry: { rarity: 1 },
    Yaris: { rarity: 1 },
    RAV4: { rarity: 1 },
    "Aygo": { rarity: 1 },
    "Aygo X": { rarity: 2 },
    Prius: { rarity: 2 },
    Hilux: { rarity: 3 },
    "C-HR": { rarity: 2 },
    Alphard: { rarity: 7 },
  },
  Honda: {
    "*": { rarity: 3 },
    NSX: { rarity: 9 },
    S2000: { rarity: 7 },
    "Civic Type R": { rarity: 6 },
    Civic: { rarity: 2 },
    Accord: { rarity: 2 },
    "CR-V": { rarity: 2 },
    "HR-V": { rarity: 2 },
  },
  Nissan: {
    "*": { rarity: 3 },
    "GT-R": { rarity: 7 },
    Skyline: { rarity: 8 },
    "200SX": { rarity: 7 },
    Silvia: { rarity: 8 },
    "350Z": { rarity: 5 },
    "370Z": { rarity: 6 },
    Z: { rarity: 6 },
    Qashqai: { rarity: 1 },
    Juke: { rarity: 2 },
    Micra: { rarity: 1 },
    Leaf: { rarity: 3 },
    "X-Trail": { rarity: 2 },
    Patrol: { rarity: 5 },
    "100NX": { rarity: 6 },
    Pulsar: { rarity: 3 },
  },
  Mazda: {
    "*": { rarity: 3 },
    "RX-7": { rarity: 8 },
    "RX-8": { rarity: 6 },
    "MX-5 Miata": { rarity: 4 },
    "3": { rarity: 2 },
    "CX-5": { rarity: 2 },
  },
  Subaru: {
    "*": { rarity: 4 },
    WRX: { rarity: 5 },
    BRZ: { rarity: 6 },
    Impreza: { rarity: 3 },
    Outback: { rarity: 3 },
    Forester: { rarity: 3 },
  },
  Lexus: {
    "*": { rarity: 5 },
    LFA: { productionNumbers: 500, rarity: 10 },
    LC: { rarity: 7 },
    IS: { rarity: 4 },
    RX: { rarity: 4 },
    NX: { rarity: 4 },
  },
  Acura: {
    "*": { rarity: 5 },
    NSX: { rarity: 8 },
    Integra: { rarity: 5 },
  },
  Mitsubishi: {
    "*": { rarity: 3 },
    "Lancer Evolution": { rarity: 7 },
    "3000GT": { rarity: 8 },
    Outlander: { rarity: 2 },
    "Eclipse Cross": { rarity: 3 },
  },
  Suzuki: {
    "*": { rarity: 3 },
    Jimny: { rarity: 5 },
    "Swift Sport": { rarity: 4 },
    Vitara: { rarity: 3 },
  },
  Infiniti: {
    "*": { rarity: 5 },
    Q60: { rarity: 6 },
  },

  // --- Coréen ---
  Hyundai: {
    "*": { rarity: 2 },
    "Ioniq 5 N": { rarity: 6 },
    "i20 N": { rarity: 5 },
    "i30 N": { rarity: 5 },
    Tucson: { rarity: 2 },
    Kona: { rarity: 2 },
  },
  Kia: {
    "*": { rarity: 2 },
    Stinger: { rarity: 6 },
    EV6: { rarity: 4 },
    Sportage: { rarity: 2 },
    Picanto: { rarity: 1 },
    Ceed: { rarity: 2 },
  },
  Genesis: {
    "*": { rarity: 6 },
    G90: { rarity: 7 },
    G80: { rarity: 6 },
    G70: { rarity: 6 },
  },

  // --- Américain ---
  Ford: {
    "*": { rarity: 3 },
    GT: { productionNumbers: 4038, rarity: 9 },
    "F-150": { rarity: 1 },
    Mustang: { rarity: 4 },
    "Focus RS": { rarity: 6 },
    "Fiesta ST": { rarity: 5 },
    Raptor: { rarity: 6 },
    Capri: { rarity: 7 },
    Escort: { rarity: 4 },
    Sierra: { rarity: 5 },
    Thunderbird: { rarity: 6 },
    Focus: { rarity: 2 },
    Fiesta: { rarity: 1 },
    Mondeo: { rarity: 2 },
    Kuga: { rarity: 2 },
    Puma: { rarity: 2 },
    "Mustang Mach-E": { rarity: 4 },
    Transit: { rarity: 1 },
    Ranger: { rarity: 3 },
    Bronco: { rarity: 5 },
  },
  Chevrolet: {
    "*": { rarity: 3 },
    Corvette: { rarity: 7 },
    Camaro: { rarity: 5 },
    Silverado: { rarity: 2 },
    Tahoe: { rarity: 4 },
    Equinox: { rarity: 2 },
  },
  Dodge: {
    "*": { rarity: 4 },
    Viper: { rarity: 8 },
    Challenger: { rarity: 5 },
    Charger: { rarity: 5 },
    Durango: { rarity: 4 },
  },
  Cadillac: {
    "*": { rarity: 5 },
    "CT5-V": { rarity: 6 },
    Escalade: { rarity: 5 },
    Lyriq: { rarity: 5 },
  },
  Lincoln: {
    "*": { rarity: 5 },
    Navigator: { rarity: 5 },
  },
  Tesla: {
    "*": { rarity: 4 },
    Roadster: { productionNumbers: 2450, rarity: 8 },
    "Model S": { rarity: 4 },
    "Model 3": { rarity: 3 },
    "Model X": { rarity: 4 },
    "Model Y": { rarity: 3 },
    Cybertruck: { rarity: 6 },
  },
  Rivian: {
    "*": { rarity: 7 },
    R1T: { rarity: 7 },
    R1S: { rarity: 7 },
  },
  Lucid: {
    "*": { rarity: 7 },
    Air: { rarity: 7 },
    Gravity: { rarity: 7 },
  },

  // --- Français ---
  Renault: {
    "*": { rarity: 2 },
    "Alpine A110": { rarity: 7 },
    "Mégane RS": { rarity: 5 },
    "R5 Turbo": { productionNumbers: 4987, rarity: 8 },
    "R8 Gordini": { rarity: 9 },
    R5: { rarity: 4 },
    Clio: { rarity: 1 },
    Twingo: { rarity: 2 },
    Megane: { rarity: 1 },
    Scenic: { rarity: 2 },
    Captur: { rarity: 1 },
    Espace: { rarity: 3 },
    Kadjar: { rarity: 2 },
    Arkana: { rarity: 3 },
    Austral: { rarity: 3 },
    Zoe: { rarity: 2 },
    Laguna: { rarity: 3 },
    R21: { rarity: 4 },
  },
  Peugeot: {
    "*": { rarity: 2 },
    "205": { rarity: 4 },
    "106": { rarity: 3 },
    "206": { rarity: 1 },
    "207": { rarity: 1 },
    "208": { rarity: 1 },
    "306": { rarity: 3 },
    "308": { rarity: 2 },
    "406": { rarity: 3 },
    "407": { rarity: 3 },
    "504": { rarity: 6 },
    "505": { rarity: 6 },
    "508": { rarity: 3 },
    "605": { rarity: 5 },
    "607": { rarity: 5 },
    "2008": { rarity: 1 },
    "3008": { rarity: 2 },
    "5008": { rarity: 2 },
    RCZ: { rarity: 5 },
  },
  "Citroën": {
    "*": { rarity: 2 },
    C3: { rarity: 1 },
    C4: { rarity: 2 },
    "C5 X": { rarity: 4 },
    Berlingo: { rarity: 1 },
    DS3: { rarity: 4 },
  },
  "DS Automobiles": {
    "*": { rarity: 5 },
    "DS 3": { rarity: 4 },
    "DS 4": { rarity: 5 },
    "DS 7": { rarity: 5 },
    "DS 9": { rarity: 6 },
  },
  Dacia: {
    "*": { rarity: 1 },
    Duster: { rarity: 1 },
    Sandero: { rarity: 1 },
    Spring: { rarity: 2 },
    Jogger: { rarity: 2 },
  },

  // --- Italien courant ---
  Fiat: {
    "*": { rarity: 2 },
    "500": { rarity: 2 },
    "124 Spider": { rarity: 5 },
    Panda: { rarity: 1 },
    Tipo: { rarity: 2 },
    Multipla: { rarity: 5 },
    Uno: { rarity: 4 },
    Ducato: { rarity: 1 },
  },
  "Alfa Romeo": {
    "*": { rarity: 5 },
    "33 Stradale": { productionNumbers: 33, rarity: 10 },
    SZ: { productionNumbers: 1036, rarity: 9 },
    RZ: { productionNumbers: 252, rarity: 9 },
    "4C": { rarity: 7 },
    GTV: { rarity: 6 },
    Spider: { rarity: 7 },
    Giulia: { rarity: 5 },
    Stelvio: { rarity: 5 },
    Brera: { rarity: 6 },
    "75": { rarity: 6 },
    "164": { rarity: 6 },
    Giulietta: { rarity: 4 },
    Mito: { rarity: 3 },
    "147": { rarity: 3 },
    "156": { rarity: 4 },
    "159": { rarity: 5 },
    Tonale: { rarity: 5 },
  },
  Abarth: {
    "*": { rarity: 5 },
    "695": { rarity: 6 },
    "595": { rarity: 5 },
    "500": { rarity: 4 },
    "124 Spider": { rarity: 6 },
  },
  Lancia: {
    "*": { rarity: 6 },
    Stratos: { productionNumbers: 492, rarity: 10 },
    "037": { productionNumbers: 207, rarity: 10 },
    Delta: { rarity: 6 },
    Ypsilon: { rarity: 3 },
  },
  "De Tomaso": {
    "*": { rarity: 9 },
    Pantera: { productionNumbers: 7260, rarity: 8 },
    Mangusta: { productionNumbers: 401, rarity: 10 },
    P72: { productionNumbers: 72, rarity: 10 },
  },

  // --- Anglais ---
  Jaguar: {
    "*": { rarity: 6 },
    "E-Type": { rarity: 9 },
    XJ220: { productionNumbers: 281, rarity: 10 },
    "F-Type": { rarity: 6 },
    XE: { rarity: 5 },
    XF: { rarity: 5 },
    "F-Pace": { rarity: 5 },
  },
  "Land Rover": {
    "*": { rarity: 4 },
    "Range Rover": { rarity: 5 },
    "Range Rover Sport": { rarity: 5 },
    Defender: { rarity: 5 },
    Discovery: { rarity: 4 },
    Evoque: { rarity: 3 },
  },
  Mini: {
    "*": { rarity: 3 },
    "John Cooper Works": { rarity: 5 },
    "Cooper S": { rarity: 3 },
    Cooper: { rarity: 2 },
    Countryman: { rarity: 3 },
  },
  Morgan: {
    "*": { rarity: 8 },
    "Plus Six": { rarity: 8 },
    "Plus Four": { rarity: 8 },
    "Super 3": { rarity: 8 },
  },
  Caterham: {
    "*": { rarity: 8 },
    Seven: { rarity: 8 },
    "620": { rarity: 9 },
  },
  Ariel: {
    "*": { rarity: 9 },
    Atom: { rarity: 9 },
    Nomad: { rarity: 9 },
  },
  Noble: {
    "*": { rarity: 9 },
    M600: { rarity: 9 },
    M12: { rarity: 9 },
  },
  Bristol: {
    "*": { rarity: 9 },
    Fighter: { rarity: 10 },
  },
  Ginetta: {
    "*": { rarity: 8 },
    Akula: { rarity: 9 },
  },

  // --- Allemand courant ---
  Volkswagen: {
    "*": { rarity: 2 },
    Golf: { rarity: 1 },
    "Golf GTI": { rarity: 3 },
    "Golf R": { rarity: 5 },
    "Golf GTI Clubsport": { rarity: 5 },
    Corrado: { rarity: 6 },
    Scirocco: { rarity: 5 },
    Arteon: { rarity: 4 },
    Polo: { rarity: 1 },
    Passat: { rarity: 2 },
    Tiguan: { rarity: 1 },
    Touareg: { rarity: 4 },
    "Up!": { rarity: 2 },
    "ID.Buzz": { rarity: 5 },
    Amarok: { rarity: 4 },
    Transporter: { rarity: 3 },
    "T-Roc": { rarity: 2 },
  },
  Opel: {
    "*": { rarity: 2 },
    Corsa: { rarity: 1 },
    Astra: { rarity: 1 },
    Mokka: { rarity: 2 },
    Insignia: { rarity: 3 },
    Grandland: { rarity: 2 },
  },
  Smart: {
    "*": { rarity: 3 },
    ForTwo: { rarity: 2 },
    ForFour: { rarity: 2 },
    "#1": { rarity: 4 },
  },

  // --- Espagnol / Tchèque ---
  Seat: {
    "*": { rarity: 2 },
    Leon: { rarity: 2 },
    Ibiza: { rarity: 1 },
    Arona: { rarity: 2 },
    Ateca: { rarity: 3 },
  },
  Cupra: {
    "*": { rarity: 4 },
    Formentor: { rarity: 4 },
    Leon: { rarity: 4 },
    Born: { rarity: 4 },
    Tavascan: { rarity: 5 },
  },
  Skoda: {
    "*": { rarity: 2 },
    Octavia: { rarity: 1 },
    Superb: { rarity: 3 },
    Fabia: { rarity: 1 },
    Kodiaq: { rarity: 3 },
    Enyaq: { rarity: 3 },
  },

  // --- Suédois ---
  Volvo: {
    "*": { rarity: 3 },
    XC90: { rarity: 4 },
    XC60: { rarity: 3 },
    XC40: { rarity: 3 },
    S60: { rarity: 3 },
    S90: { rarity: 4 },
    V90: { rarity: 4 },
    C30: { rarity: 5 },
  },
  Polestar: {
    "*": { rarity: 7 },
    "1": { productionNumbers: 1500, rarity: 8 },
    "2": { rarity: 5 },
    "3": { rarity: 7 },
    "4": { rarity: 7 },
  },
  Saab: {
    "*": { rarity: 6 },
    "900": { rarity: 6 },
    "9-3": { rarity: 5 },
    "9-5": { rarity: 5 },
    "9000": { rarity: 6 },
  },

  // --- Divers Européen ---
  Wiesmann: {
    "*": { rarity: 9 },
    MF5: { rarity: 9 },
    GT: { rarity: 9 },
  },
  Donkervoort: {
    "*": { rarity: 9 },
    D8: { rarity: 9 },
    F22: { productionNumbers: 75, rarity: 10 },
    "D8 GTO": { rarity: 9 },
  },
  "Hispano-Suiza": {
    "*": { rarity: 10 },
    Carmen: { rarity: 10 },
  },
  Spyker: {
    "*": { rarity: 10 },
    C8: { rarity: 10 },
  },
  DeLorean: {
    "*": { rarity: 9 },
    "DMC-12": { productionNumbers: 9000, rarity: 8 },
  },
  Gumpert: {
    "*": { rarity: 10 },
    Apollo: { rarity: 10 },
  },
  Italdesign: {
    "*": { rarity: 10 },
    Zerouno: { productionNumbers: 5, rarity: 10 },
  },
  "Austin-Healey": {
    "*": { rarity: 9 },
    "3000": { rarity: 9 },
    Sprite: { rarity: 8 },
  },

  // --- Jeep ---
  Jeep: {
    "*": { rarity: 4 },
    Wrangler: { rarity: 4 },
    "Grand Cherokee": { rarity: 4 },
    Renegade: { rarity: 3 },
    Compass: { rarity: 3 },
    Wagoneer: { rarity: 6 },
    Gladiator: { rarity: 5 },
  },
  Ineos: {
    "*": { rarity: 7 },
    Grenadier: { rarity: 7 },
  },

  // --- Chinois & Électrique ---
  BYD: {
    "*": { rarity: 4 },
    "Yangwang U8": { rarity: 8 },
    Seal: { rarity: 5 },
    Han: { rarity: 5 },
    Dolphin: { rarity: 3 },
    "Atto 3": { rarity: 4 },
  },
  NIO: {
    "*": { rarity: 6 },
    EP9: { productionNumbers: 16, rarity: 10 },
    ET7: { rarity: 6 },
    ET5: { rarity: 5 },
  },
  XPeng: { "*": { rarity: 5 } },
  Zeekr: { "*": { rarity: 5 } },
  "Lynk & Co": { "*": { rarity: 5 } },
  VinFast: { "*": { rarity: 5 } },
  Aiways: { "*": { rarity: 5 } },
  ORA: { "*": { rarity: 4 } },
  Seres: { "*": { rarity: 4 } },
  Hongqi: {
    "*": { rarity: 7 },
    S9: { rarity: 9 },
    H9: { rarity: 7 },
  },

  // --- Autres constructeurs courants ---
  MG: {
    "*": { rarity: 3 },
    MGB: { rarity: 7 },
    Midget: { rarity: 7 },
    TF: { rarity: 6 },
    MG4: { rarity: 3 },
    ZS: { rarity: 2 },
  },
  Lada: {
    "*": { rarity: 3 },
    Niva: { rarity: 4 },
    "2107": { rarity: 4 },
  },
  Datsun: {
    "*": { rarity: 5 },
    "240Z": { rarity: 8 },
  },
  Tata: { "*": { rarity: 3 } },
  Proton: { "*": { rarity: 4 } },
  SsangYong: { "*": { rarity: 3 } },
  Geely: { "*": { rarity: 3 } },
  Chery: { "*": { rarity: 3 } },
  Changan: { "*": { rarity: 3 } },
  GAC: { "*": { rarity: 3 } },
  Dongfeng: { "*": { rarity: 3 } },
  FAW: { "*": { rarity: 4 } },
  Fisker: {
    "*": { rarity: 7 },
    Karma: { rarity: 8 },
  },
  Karma: { "*": { rarity: 7 } },
  Bollore: { "*": { rarity: 6 } },
  Maxus: { "*": { rarity: 4 } },
  Borgward: { "*": { rarity: 5 } },
  Brilliance: { "*": { rarity: 4 } },
  Qoros: { "*": { rarity: 5 } },
  JAC: { "*": { rarity: 3 } },
  Hozon: { "*": { rarity: 4 } },
  Weltmeister: { "*": { rarity: 5 } },
  Excalibur: { "*": { rarity: 9 } },
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
 * Calculate rarity rating. Uses units_produced when available, otherwise falls back to
 * the static brand/model dictionary.
 */
export function calculateRarityRating(brand: string, model: string, unitsProduced?: number | null): RarityRating {
  if (unitsProduced != null && unitsProduced > 0) {
    const level = getRarityFromUnits(unitsProduced);
    return { level, label: getRarityLabel(level) };
  }

  const brandData = carProductionData[brand];

  if (!brandData) {
    return { level: 3, label: getRarityLabel(3) };
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

  return { level: 3, label: getRarityLabel(3) };
}
