// 200 game cards: 4 archetypes × 50 cards each
// Within each archetype: 20 common, 15 uncommon, 10 rare, 5 mythic

export type CardRarity = "common" | "uncommon" | "rare" | "mythic";
export type CardArchetype = "speed" | "resilience" | "adaptability" | "power";
export type CardCondition = "damaged" | "average" | "good" | "perfect";

export interface GameCardDef {
  name: string;
  brand: string;
  model: string;
  archetype: CardArchetype;
  rarity: CardRarity;
  speed: number;
  resilience: number;
  adaptability: number;
  power: number;
  hp: number;
  condition?: CardCondition;
}

export const CONDITION_MODIFIERS: Record<CardCondition, number> = {
  damaged: 0.7,
  average: 0.9,
  good: 1.0,
  perfect: 1.15,
};

export const CONDITION_META: Record<
  CardCondition,
  { label: string; labelFr: string; emoji: string; overlayClass: string; badgeClass: string }
> = {
  damaged: {
    label: "Damaged",
    labelFr: "Abîmée",
    emoji: "💀",
    overlayClass: "condition-damaged",
    badgeClass: "bg-red-900/80 text-red-300 border-red-700",
  },
  average: {
    label: "Average",
    labelFr: "Moyenne",
    emoji: "😐",
    overlayClass: "condition-average",
    badgeClass: "bg-zinc-700/80 text-zinc-300 border-zinc-500",
  },
  good: {
    label: "Good",
    labelFr: "Bon état",
    emoji: "✅",
    overlayClass: "condition-good",
    badgeClass: "bg-emerald-900/80 text-emerald-300 border-emerald-600",
  },
  perfect: {
    label: "Perfect",
    labelFr: "Parfaite",
    emoji: "⭐",
    overlayClass: "condition-perfect",
    badgeClass: "bg-amber-900/80 text-amber-300 border-amber-500",
  },
};

const HP: Record<CardRarity, number> = { common: 10, uncommon: 15, rare: 22, mythic: 32 };

function c(brand: string, model: string, arch: CardArchetype, rarity: CardRarity, speed: number, resilience: number, adaptability: number, power: number): GameCardDef {
  return { name: `${brand} ${model}`, brand, model, archetype: arch, rarity, speed, resilience, adaptability, power, hp: HP[rarity] };
}

// ---- SPEED ARCHETYPE (50 cards) ----
// Matrix: SPD strong, ADP secondary, RES/PWR weak. Totals: common 14, uncommon 20, rare 27, mythic 34.
const speedCards: GameCardDef[] = [
  // 20 Common — total: 14
  c("Toyota", "Corolla", "speed", "common", 5, 1, 4, 4),
  c("Honda", "Civic", "speed", "common", 6, 1, 4, 3),
  c("Mazda", "MX-5", "speed", "common", 6, 2, 3, 3),
  c("Fiat", "Punto", "speed", "common", 5, 2, 4, 3),
  c("Peugeot", "206", "speed", "common", 5, 1, 5, 3),
  c("Renault", "Clio", "speed", "common", 6, 2, 3, 3),
  c("Suzuki", "Swift", "speed", "common", 6, 1, 4, 3),
  c("VW", "Polo", "speed", "common", 5, 2, 4, 3),
  c("Opel", "Corsa", "speed", "common", 5, 2, 3, 4),
  c("Seat", "Ibiza", "speed", "common", 5, 1, 5, 3),
  c("Hyundai", "i20", "speed", "common", 5, 2, 4, 3),
  c("Kia", "Rio", "speed", "common", 5, 2, 3, 4),
  c("Dacia", "Sandero", "speed", "common", 5, 2, 3, 4),
  c("Citroën", "C3", "speed", "common", 5, 1, 5, 3),
  c("Ford", "Fiesta", "speed", "common", 6, 2, 3, 3),
  c("Nissan", "Micra", "speed", "common", 5, 2, 4, 3),
  c("Skoda", "Fabia", "speed", "common", 5, 2, 4, 3),
  c("Mini", "One", "speed", "common", 6, 1, 4, 3),
  c("Smart", "ForTwo", "speed", "common", 5, 2, 4, 3),
  c("Lancia", "Ypsilon", "speed", "common", 5, 2, 3, 4),
  // 15 Uncommon — total: 20
  c("BMW", "M135i", "speed", "uncommon", 7, 2, 5, 6),
  c("Audi", "S3", "speed", "uncommon", 7, 3, 5, 5),
  c("Mercedes", "A35 AMG", "speed", "uncommon", 8, 2, 5, 5),
  c("VW", "Golf GTI", "speed", "uncommon", 7, 3, 5, 5),
  c("Honda", "Civic Type R", "speed", "uncommon", 8, 2, 5, 5),
  c("Toyota", "GR Yaris", "speed", "uncommon", 8, 3, 4, 5),
  c("Ford", "Focus ST", "speed", "uncommon", 7, 3, 5, 5),
  c("Hyundai", "i30 N", "speed", "uncommon", 7, 3, 5, 5),
  c("Renault", "Mégane RS", "speed", "uncommon", 8, 2, 5, 5),
  c("Peugeot", "308 GTi", "speed", "uncommon", 7, 3, 5, 5),
  c("Alfa Romeo", "Giulietta QV", "speed", "uncommon", 8, 2, 5, 5),
  c("Mini", "JCW", "speed", "uncommon", 8, 3, 4, 5),
  c("Seat", "Leon Cupra", "speed", "uncommon", 7, 3, 5, 5),
  c("Mazda", "MX-5 RF", "speed", "uncommon", 7, 2, 6, 5),
  c("Subaru", "BRZ", "speed", "uncommon", 7, 3, 5, 5),
  // 10 Rare — total: 27
  c("Porsche", "718 Cayman", "speed", "rare", 9, 3, 6, 9),
  c("BMW", "M2", "speed", "rare", 9, 4, 6, 8),
  c("Audi", "RS3", "speed", "rare", 9, 3, 6, 9),
  c("Mercedes", "C63 AMG", "speed", "rare", 9, 4, 6, 8),
  c("Lotus", "Elise", "speed", "rare", 10, 3, 6, 8),
  c("Alpine", "A110", "speed", "rare", 10, 3, 6, 8),
  c("Toyota", "GR Supra", "speed", "rare", 9, 4, 6, 8),
  c("Nissan", "370Z Nismo", "speed", "rare", 9, 3, 6, 9),
  c("Chevrolet", "Corvette C7", "speed", "rare", 9, 4, 5, 9),
  c("Jaguar", "F-Type R", "speed", "rare", 9, 4, 6, 8),
  // 5 Mythic — total: 34
  c("Ferrari", "F8 Tributo", "speed", "mythic", 10, 6, 9, 9),
  c("McLaren", "720S", "speed", "mythic", 10, 5, 10, 9),
  c("Lamborghini", "Huracán EVO", "speed", "mythic", 10, 6, 9, 9),
  c("Porsche", "911 GT3 RS", "speed", "mythic", 10, 6, 9, 9),
  c("Bugatti", "Chiron", "speed", "mythic", 10, 6, 9, 9),
];

// ---- RESILIENCE ARCHETYPE (50 cards) ----
// Matrix: RES strong, PWR secondary, SPD/ADP weak. Totals: common 14, uncommon 20, rare 27, mythic 34.
const resilienceCards: GameCardDef[] = [
  // 20 Common — total: 14
  c("Toyota", "Land Cruiser 70", "resilience", "common", 1, 6, 2, 5),
  c("Jeep", "Wrangler", "resilience", "common", 2, 6, 1, 5),
  c("Land Rover", "Defender 90", "resilience", "common", 1, 6, 2, 5),
  c("Suzuki", "Jimny", "resilience", "common", 2, 5, 2, 5),
  c("Mitsubishi", "Pajero", "resilience", "common", 1, 6, 2, 5),
  c("Nissan", "Patrol", "resilience", "common", 2, 6, 1, 5),
  c("Ford", "Bronco Sport", "resilience", "common", 2, 5, 2, 5),
  c("Chevrolet", "Tahoe", "resilience", "common", 1, 6, 2, 5),
  c("Dodge", "Durango", "resilience", "common", 2, 5, 2, 5),
  c("GMC", "Yukon", "resilience", "common", 1, 6, 2, 5),
  c("Toyota", "4Runner", "resilience", "common", 2, 6, 1, 5),
  c("Isuzu", "Trooper", "resilience", "common", 1, 6, 2, 5),
  c("Ssangyong", "Rexton", "resilience", "common", 2, 5, 2, 5),
  c("Dacia", "Duster", "resilience", "common", 2, 5, 2, 5),
  c("Lada", "Niva", "resilience", "common", 1, 6, 2, 5),
  c("UAZ", "Hunter", "resilience", "common", 2, 6, 1, 5),
  c("Mahindra", "Thar", "resilience", "common", 1, 6, 2, 5),
  c("Great Wall", "Hover", "resilience", "common", 2, 5, 2, 5),
  c("Tata", "Safari", "resilience", "common", 1, 6, 2, 5),
  c("Fiat", "Panda 4x4", "resilience", "common", 2, 5, 2, 5),
  // 15 Uncommon — total: 20
  c("Toyota", "Land Cruiser 200", "resilience", "uncommon", 2, 8, 3, 7),
  c("Jeep", "Grand Cherokee", "resilience", "uncommon", 3, 7, 3, 7),
  c("Land Rover", "Discovery", "resilience", "uncommon", 2, 8, 3, 7),
  c("Mercedes", "G350d", "resilience", "uncommon", 2, 8, 2, 8),
  c("Ford", "F-150", "resilience", "uncommon", 3, 7, 3, 7),
  c("RAM", "1500", "resilience", "uncommon", 2, 7, 3, 8),
  c("Chevrolet", "Silverado", "resilience", "uncommon", 2, 8, 3, 7),
  c("Toyota", "Hilux", "resilience", "uncommon", 3, 7, 3, 7),
  c("Nissan", "Navara", "resilience", "uncommon", 3, 7, 2, 8),
  c("VW", "Amarok", "resilience", "uncommon", 3, 7, 3, 7),
  c("Ford", "Ranger Raptor", "resilience", "uncommon", 3, 7, 3, 7),
  c("Mitsubishi", "L200", "resilience", "uncommon", 2, 8, 3, 7),
  c("Isuzu", "D-Max", "resilience", "uncommon", 2, 8, 3, 7),
  c("Hummer", "H3", "resilience", "uncommon", 2, 8, 2, 8),
  c("Jeep", "Gladiator", "resilience", "uncommon", 2, 8, 3, 7),
  // 10 Rare — total: 27
  c("Mercedes", "G63 AMG", "resilience", "rare", 4, 9, 4, 10),
  c("Land Rover", "Defender V8", "resilience", "rare", 4, 9, 4, 10),
  c("Toyota", "Land Cruiser 300", "resilience", "rare", 3, 10, 4, 10),
  c("Jeep", "Wrangler Rubicon 392", "resilience", "rare", 4, 9, 4, 10),
  c("Ford", "F-150 Raptor", "resilience", "rare", 4, 9, 4, 10),
  c("RAM", "TRX", "resilience", "rare", 4, 8, 5, 10),
  c("Rivian", "R1T", "resilience", "rare", 4, 9, 5, 9),
  c("Lamborghini", "Urus", "resilience", "rare", 5, 8, 4, 10),
  c("Bentley", "Bentayga", "resilience", "rare", 4, 9, 4, 10),
  c("Rolls-Royce", "Cullinan", "resilience", "rare", 3, 10, 4, 10),
  // 5 Mythic — total: 34
  c("Mercedes", "G63 AMG 6x6", "resilience", "mythic", 6, 10, 8, 10),
  c("Brabus", "G900", "resilience", "mythic", 6, 10, 8, 10),
  c("Karlmann", "King", "resilience", "mythic", 5, 10, 9, 10),
  c("Marauder", "Armoured", "resilience", "mythic", 4, 10, 10, 10),
  c("Rezvani", "Tank Military", "resilience", "mythic", 6, 10, 8, 10),
];

// ---- ADAPTABILITY ARCHETYPE (50 cards) ----
// Matrix: ADP strong, SPD secondary, PWR/RES weak. Totals: common 14, uncommon 20, rare 27, mythic 34.
const adaptabilityCards: GameCardDef[] = [
  // 20 Common — total: 14
  c("Toyota", "Prius", "adaptability", "common", 3, 1, 6, 4),
  c("Honda", "Jazz", "adaptability", "common", 4, 1, 5, 4),
  c("Renault", "Captur", "adaptability", "common", 3, 2, 5, 4),
  c("Peugeot", "3008", "adaptability", "common", 3, 2, 5, 4),
  c("Citroën", "C4 Cactus", "adaptability", "common", 3, 1, 6, 4),
  c("Nissan", "Juke", "adaptability", "common", 4, 2, 4, 4),
  c("Kia", "Niro", "adaptability", "common", 3, 2, 5, 4),
  c("Hyundai", "Kona", "adaptability", "common", 4, 1, 5, 4),
  c("Skoda", "Karoq", "adaptability", "common", 3, 2, 5, 4),
  c("VW", "T-Cross", "adaptability", "common", 3, 2, 5, 4),
  c("Opel", "Crossland", "adaptability", "common", 3, 2, 5, 4),
  c("Ford", "Puma", "adaptability", "common", 4, 2, 4, 4),
  c("Mazda", "CX-3", "adaptability", "common", 4, 1, 5, 4),
  c("Subaru", "XV", "adaptability", "common", 3, 2, 5, 4),
  c("Mitsubishi", "Eclipse Cross", "adaptability", "common", 3, 1, 6, 4),
  c("Suzuki", "Vitara", "adaptability", "common", 3, 2, 5, 4),
  c("Seat", "Arona", "adaptability", "common", 4, 2, 4, 4),
  c("Fiat", "500X", "adaptability", "common", 3, 1, 6, 4),
  c("Jeep", "Renegade", "adaptability", "common", 3, 2, 5, 4),
  c("MG", "ZS", "adaptability", "common", 4, 2, 4, 4),
  // 15 Uncommon — total: 20
  c("Tesla", "Model 3", "adaptability", "uncommon", 5, 2, 8, 5),
  c("BMW", "i4", "adaptability", "uncommon", 5, 3, 7, 5),
  c("Audi", "Q5", "adaptability", "uncommon", 4, 3, 8, 5),
  c("Mercedes", "GLC", "adaptability", "uncommon", 4, 3, 8, 5),
  c("Volvo", "XC60", "adaptability", "uncommon", 4, 3, 8, 5),
  c("Porsche", "Macan", "adaptability", "uncommon", 6, 3, 6, 5),
  c("Jaguar", "E-Pace", "adaptability", "uncommon", 5, 3, 7, 5),
  c("Alfa Romeo", "Stelvio", "adaptability", "uncommon", 5, 2, 8, 5),
  c("Lexus", "NX", "adaptability", "uncommon", 4, 3, 8, 5),
  c("Infiniti", "QX50", "adaptability", "uncommon", 4, 3, 8, 5),
  c("Genesis", "GV70", "adaptability", "uncommon", 5, 3, 7, 5),
  c("DS", "7 Crossback", "adaptability", "uncommon", 4, 3, 8, 5),
  c("Maserati", "Grecale", "adaptability", "uncommon", 6, 2, 7, 5),
  c("Cupra", "Formentor", "adaptability", "uncommon", 6, 2, 7, 5),
  c("Polestar", "2", "adaptability", "uncommon", 5, 3, 7, 5),
  // 10 Rare — total: 27
  c("Tesla", "Model S Plaid", "adaptability", "rare", 6, 3, 10, 8),
  c("Porsche", "Cayenne Turbo", "adaptability", "rare", 6, 4, 9, 8),
  c("BMW", "X5 M", "adaptability", "rare", 6, 4, 9, 8),
  c("Audi", "RS Q8", "adaptability", "rare", 6, 4, 9, 8),
  c("Mercedes", "GLE 63", "adaptability", "rare", 5, 4, 10, 8),
  c("Range Rover", "Sport SVR", "adaptability", "rare", 6, 4, 9, 8),
  c("Maserati", "Levante Trofeo", "adaptability", "rare", 6, 3, 10, 8),
  c("Aston Martin", "DBX", "adaptability", "rare", 5, 4, 10, 8),
  c("Ferrari", "Purosangue", "adaptability", "rare", 7, 3, 9, 8),
  c("Lotus", "Eletre", "adaptability", "rare", 6, 4, 9, 8),
  // 5 Mythic — total: 34
  c("Rimac", "Nevera", "adaptability", "mythic", 9, 5, 10, 10),
  c("Tesla", "Roadster 2025", "adaptability", "mythic", 9, 5, 10, 10),
  c("Koenigsegg", "Gemera", "adaptability", "mythic", 8, 6, 10, 10),
  c("Aston Martin", "Valkyrie", "adaptability", "mythic", 9, 5, 10, 10),
  c("Pagani", "Utopia", "adaptability", "mythic", 8, 6, 10, 10),
];

// ---- POWER ARCHETYPE (50 cards) ----
// Matrix: PWR strong, RES secondary, ADP/SPD weak. Totals: common 14, uncommon 20, rare 27, mythic 34.
const powerCards: GameCardDef[] = [
  // 20 Common — total: 14
  c("Ford", "Mustang V6", "power", "common", 1, 4, 2, 7),
  c("Chevrolet", "Camaro LT", "power", "common", 2, 4, 2, 6),
  c("Dodge", "Challenger SXT", "power", "common", 1, 5, 2, 6),
  c("Pontiac", "Firebird", "power", "common", 2, 4, 2, 6),
  c("Mercury", "Cougar", "power", "common", 1, 4, 2, 7),
  c("Chrysler", "300", "power", "common", 2, 4, 2, 6),
  c("Buick", "Grand National", "power", "common", 2, 4, 2, 6),
  c("Oldsmobile", "442", "power", "common", 2, 4, 2, 6),
  c("Plymouth", "Barracuda", "power", "common", 1, 5, 2, 6),
  c("AMC", "Javelin", "power", "common", 2, 4, 2, 6),
  c("Holden", "Commodore", "power", "common", 2, 4, 2, 6),
  c("Vauxhall", "VXR8", "power", "common", 2, 5, 1, 6),
  c("HSV", "GTS", "power", "common", 2, 5, 1, 6),
  c("Ford", "Falcon XR6", "power", "common", 2, 4, 2, 6),
  c("Nissan", "Silvia S13", "power", "common", 2, 4, 2, 6),
  c("Mitsubishi", "Eclipse", "power", "common", 2, 4, 2, 6),
  c("Toyota", "Celica", "power", "common", 2, 4, 2, 6),
  c("Mazda", "RX-7 FC", "power", "common", 2, 4, 2, 6),
  c("Honda", "Prelude", "power", "common", 2, 4, 2, 6),
  c("Subaru", "Legacy GT", "power", "common", 1, 5, 2, 6),
  // 15 Uncommon — total: 20
  c("Ford", "Mustang GT", "power", "uncommon", 2, 6, 3, 9),
  c("Chevrolet", "Camaro SS", "power", "uncommon", 2, 6, 3, 9),
  c("Dodge", "Challenger R/T", "power", "uncommon", 2, 7, 3, 8),
  c("Nissan", "GT-R", "power", "uncommon", 3, 5, 3, 9),
  c("Subaru", "WRX STI", "power", "uncommon", 3, 6, 3, 8),
  c("Mitsubishi", "Lancer Evo X", "power", "uncommon", 3, 5, 4, 8),
  c("BMW", "M3 E46", "power", "uncommon", 3, 6, 3, 8),
  c("Audi", "RS4 B7", "power", "uncommon", 3, 6, 3, 8),
  c("Mercedes", "C63 W204", "power", "uncommon", 3, 6, 3, 8),
  c("Lexus", "IS F", "power", "uncommon", 3, 6, 3, 8),
  c("Cadillac", "CTS-V", "power", "uncommon", 2, 6, 3, 9),
  c("Pontiac", "GTO", "power", "uncommon", 2, 7, 3, 8),
  c("Shelby", "GT350", "power", "uncommon", 3, 5, 4, 8),
  c("Mazda", "RX-7 FD", "power", "uncommon", 4, 5, 3, 8),
  c("Toyota", "Supra MK4", "power", "uncommon", 4, 5, 3, 8),
  // 10 Rare — total: 27
  c("Dodge", "Challenger Hellcat", "power", "rare", 4, 8, 5, 10),
  c("Ford", "Mustang Shelby GT500", "power", "rare", 4, 8, 5, 10),
  c("Chevrolet", "Corvette Z06", "power", "rare", 4, 8, 5, 10),
  c("Nissan", "GT-R Nismo", "power", "rare", 5, 7, 5, 10),
  c("BMW", "M5 CS", "power", "rare", 5, 7, 5, 10),
  c("Audi", "RS6 Avant", "power", "rare", 4, 8, 5, 10),
  c("Mercedes", "E63 S", "power", "rare", 4, 8, 5, 10),
  c("Dodge", "Viper ACR", "power", "rare", 5, 7, 5, 10),
  c("Chevrolet", "Camaro ZL1", "power", "rare", 4, 8, 5, 10),
  c("Shelby", "Super Snake", "power", "rare", 4, 8, 5, 10),
  // 5 Mythic — total: 34
  c("Koenigsegg", "Jesko", "power", "mythic", 6, 10, 8, 10),
  c("Hennessey", "Venom F5", "power", "mythic", 6, 10, 8, 10),
  c("SSC", "Tuatara", "power", "mythic", 6, 10, 8, 10),
  c("Lamborghini", "Aventador SVJ", "power", "mythic", 5, 10, 9, 10),
  c("Ferrari", "LaFerrari", "power", "mythic", 5, 10, 9, 10),
];

export const ALL_GAME_CARDS: GameCardDef[] = [
  ...speedCards,
  ...resilienceCards,
  ...adaptabilityCards,
  ...powerCards,
];

// Booster rarity weights
export const RARITY_WEIGHTS: { rarity: CardRarity; weight: number }[] = [
  { rarity: "common", weight: 60 },
  { rarity: "uncommon", weight: 25 },
  { rarity: "rare", weight: 12 },
  { rarity: "mythic", weight: 3 },
];

export function pickWeightedRarity(): CardRarity {
  const total = RARITY_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return "common";
}
