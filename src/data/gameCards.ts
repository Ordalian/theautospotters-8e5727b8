// 200 game cards: 4 archetypes × 50 cards each
// Within each archetype: 20 common, 15 uncommon, 10 rare, 5 mythic

export type CardRarity = "common" | "uncommon" | "rare" | "mythic";
export type CardArchetype = "speed" | "resilience" | "adaptability" | "power";

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
}

const HP: Record<CardRarity, number> = { common: 10, uncommon: 15, rare: 22, mythic: 32 };

function c(brand: string, model: string, arch: CardArchetype, rarity: CardRarity, speed: number, resilience: number, adaptability: number, power: number): GameCardDef {
  return { name: `${brand} ${model}`, brand, model, archetype: arch, rarity, speed, resilience, adaptability, power, hp: HP[rarity] };
}

// ---- SPEED ARCHETYPE (50 cards) ----
const speedCards: GameCardDef[] = [
  // 20 Common (stat total ~12-16, high speed)
  c("Toyota", "Corolla", "speed", "common", 5, 2, 2, 3),
  c("Honda", "Civic", "speed", "common", 5, 3, 2, 2),
  c("Mazda", "MX-5", "speed", "common", 6, 2, 2, 2),
  c("Fiat", "Punto", "speed", "common", 5, 2, 3, 2),
  c("Peugeot", "206", "speed", "common", 5, 3, 2, 2),
  c("Renault", "Clio", "speed", "common", 5, 2, 2, 3),
  c("Suzuki", "Swift", "speed", "common", 6, 2, 2, 3),
  c("VW", "Polo", "speed", "common", 5, 3, 2, 2),
  c("Opel", "Corsa", "speed", "common", 5, 2, 3, 2),
  c("Seat", "Ibiza", "speed", "common", 5, 2, 2, 3),
  c("Hyundai", "i20", "speed", "common", 5, 3, 2, 2),
  c("Kia", "Rio", "speed", "common", 5, 2, 2, 3),
  c("Dacia", "Sandero", "speed", "common", 4, 3, 3, 2),
  c("Citroën", "C3", "speed", "common", 5, 2, 3, 2),
  c("Ford", "Fiesta", "speed", "common", 5, 3, 2, 3),
  c("Nissan", "Micra", "speed", "common", 5, 2, 2, 3),
  c("Skoda", "Fabia", "speed", "common", 5, 3, 2, 2),
  c("Mini", "One", "speed", "common", 6, 2, 2, 2),
  c("Smart", "ForTwo", "speed", "common", 5, 2, 3, 2),
  c("Lancia", "Ypsilon", "speed", "common", 5, 2, 2, 3),
  // 15 Uncommon (stat total ~17-22, high speed)
  c("BMW", "M135i", "speed", "uncommon", 7, 4, 3, 4),
  c("Audi", "S3", "speed", "uncommon", 7, 4, 4, 3),
  c("Mercedes", "A35 AMG", "speed", "uncommon", 7, 4, 3, 4),
  c("VW", "Golf GTI", "speed", "uncommon", 7, 4, 3, 4),
  c("Honda", "Civic Type R", "speed", "uncommon", 8, 3, 3, 4),
  c("Toyota", "GR Yaris", "speed", "uncommon", 8, 3, 4, 3),
  c("Ford", "Focus ST", "speed", "uncommon", 7, 4, 3, 4),
  c("Hyundai", "i30 N", "speed", "uncommon", 7, 4, 4, 3),
  c("Renault", "Mégane RS", "speed", "uncommon", 7, 3, 4, 4),
  c("Peugeot", "308 GTi", "speed", "uncommon", 7, 4, 3, 4),
  c("Alfa Romeo", "Giulietta QV", "speed", "uncommon", 7, 3, 4, 4),
  c("Mini", "JCW", "speed", "uncommon", 8, 3, 3, 4),
  c("Seat", "Leon Cupra", "speed", "uncommon", 7, 4, 4, 3),
  c("Mazda", "MX-5 RF", "speed", "uncommon", 7, 3, 4, 4),
  c("Subaru", "BRZ", "speed", "uncommon", 7, 3, 4, 4),
  // 10 Rare (stat total ~23-28, high speed)
  c("Porsche", "718 Cayman", "speed", "rare", 9, 5, 5, 6),
  c("BMW", "M2", "speed", "rare", 9, 5, 5, 6),
  c("Audi", "RS3", "speed", "rare", 9, 5, 5, 6),
  c("Mercedes", "C63 AMG", "speed", "rare", 9, 6, 4, 6),
  c("Lotus", "Elise", "speed", "rare", 10, 4, 5, 5),
  c("Alpine", "A110", "speed", "rare", 10, 4, 5, 5),
  c("Toyota", "GR Supra", "speed", "rare", 9, 5, 5, 6),
  c("Nissan", "370Z Nismo", "speed", "rare", 9, 5, 5, 6),
  c("Chevrolet", "Corvette C7", "speed", "rare", 9, 5, 4, 7),
  c("Jaguar", "F-Type R", "speed", "rare", 9, 5, 5, 6),
  // 5 Mythic (stat total ~29-34, high speed)
  c("Ferrari", "F8 Tributo", "speed", "mythic", 10, 7, 7, 8),
  c("McLaren", "720S", "speed", "mythic", 10, 7, 7, 8),
  c("Lamborghini", "Huracán EVO", "speed", "mythic", 10, 7, 7, 9),
  c("Porsche", "911 GT3 RS", "speed", "mythic", 10, 8, 7, 8),
  c("Bugatti", "Chiron", "speed", "mythic", 10, 8, 7, 9),
];

// ---- RESILIENCE ARCHETYPE (50 cards) ----
const resilienceCards: GameCardDef[] = [
  // 20 Common
  c("Toyota", "Land Cruiser 70", "resilience", "common", 2, 5, 3, 2),
  c("Jeep", "Wrangler", "resilience", "common", 2, 6, 2, 2),
  c("Land Rover", "Defender 90", "resilience", "common", 2, 5, 3, 2),
  c("Suzuki", "Jimny", "resilience", "common", 3, 5, 2, 2),
  c("Mitsubishi", "Pajero", "resilience", "common", 2, 5, 3, 2),
  c("Nissan", "Patrol", "resilience", "common", 2, 6, 2, 2),
  c("Ford", "Bronco Sport", "resilience", "common", 3, 5, 2, 2),
  c("Chevrolet", "Tahoe", "resilience", "common", 2, 5, 3, 2),
  c("Dodge", "Durango", "resilience", "common", 2, 5, 2, 3),
  c("GMC", "Yukon", "resilience", "common", 2, 5, 3, 2),
  c("Toyota", "4Runner", "resilience", "common", 2, 6, 2, 2),
  c("Isuzu", "Trooper", "resilience", "common", 2, 5, 3, 2),
  c("Ssangyong", "Rexton", "resilience", "common", 2, 5, 2, 3),
  c("Dacia", "Duster", "resilience", "common", 3, 5, 2, 2),
  c("Lada", "Niva", "resilience", "common", 2, 5, 3, 2),
  c("UAZ", "Hunter", "resilience", "common", 2, 6, 2, 2),
  c("Mahindra", "Thar", "resilience", "common", 2, 5, 3, 2),
  c("Great Wall", "Hover", "resilience", "common", 3, 5, 2, 2),
  c("Tata", "Safari", "resilience", "common", 2, 5, 3, 2),
  c("Fiat", "Panda 4x4", "resilience", "common", 3, 5, 2, 2),
  // 15 Uncommon
  c("Toyota", "Land Cruiser 200", "resilience", "uncommon", 3, 7, 4, 4),
  c("Jeep", "Grand Cherokee", "resilience", "uncommon", 4, 7, 3, 4),
  c("Land Rover", "Discovery", "resilience", "uncommon", 3, 7, 4, 4),
  c("Mercedes", "G350d", "resilience", "uncommon", 3, 8, 3, 4),
  c("Ford", "F-150", "resilience", "uncommon", 3, 7, 4, 4),
  c("RAM", "1500", "resilience", "uncommon", 3, 7, 3, 5),
  c("Chevrolet", "Silverado", "resilience", "uncommon", 3, 7, 4, 4),
  c("Toyota", "Hilux", "resilience", "uncommon", 4, 7, 4, 3),
  c("Nissan", "Navara", "resilience", "uncommon", 4, 7, 3, 4),
  c("VW", "Amarok", "resilience", "uncommon", 4, 7, 4, 3),
  c("Ford", "Ranger Raptor", "resilience", "uncommon", 4, 7, 4, 4),
  c("Mitsubishi", "L200", "resilience", "uncommon", 3, 7, 4, 4),
  c("Isuzu", "D-Max", "resilience", "uncommon", 3, 7, 4, 4),
  c("Hummer", "H3", "resilience", "uncommon", 3, 8, 3, 4),
  c("Jeep", "Gladiator", "resilience", "uncommon", 3, 7, 4, 4),
  // 10 Rare
  c("Mercedes", "G63 AMG", "resilience", "rare", 5, 9, 5, 6),
  c("Land Rover", "Defender V8", "resilience", "rare", 5, 9, 5, 6),
  c("Toyota", "Land Cruiser 300", "resilience", "rare", 4, 9, 6, 6),
  c("Jeep", "Wrangler Rubicon 392", "resilience", "rare", 5, 9, 5, 6),
  c("Ford", "F-150 Raptor", "resilience", "rare", 5, 9, 5, 6),
  c("RAM", "TRX", "resilience", "rare", 5, 8, 5, 7),
  c("Rivian", "R1T", "resilience", "rare", 5, 9, 6, 5),
  c("Lamborghini", "Urus", "resilience", "rare", 6, 8, 5, 6),
  c("Bentley", "Bentayga", "resilience", "rare", 5, 9, 5, 6),
  c("Rolls-Royce", "Cullinan", "resilience", "rare", 4, 10, 5, 6),
  // 5 Mythic
  c("Mercedes", "G63 AMG 6x6", "resilience", "mythic", 6, 10, 7, 9),
  c("Brabus", "G900", "resilience", "mythic", 7, 10, 7, 8),
  c("Karlmann", "King", "resilience", "mythic", 5, 10, 8, 9),
  c("Marauder", "Armoured", "resilience", "mythic", 4, 10, 8, 10),
  c("Rezvani", "Tank Military", "resilience", "mythic", 6, 10, 8, 8),
];

// ---- ADAPTABILITY ARCHETYPE (50 cards) ----
const adaptabilityCards: GameCardDef[] = [
  // 20 Common
  c("Toyota", "Prius", "adaptability", "common", 3, 2, 5, 2),
  c("Honda", "Jazz", "adaptability", "common", 3, 2, 5, 2),
  c("Renault", "Captur", "adaptability", "common", 2, 3, 5, 2),
  c("Peugeot", "3008", "adaptability", "common", 2, 3, 5, 2),
  c("Citroën", "C4 Cactus", "adaptability", "common", 2, 2, 6, 2),
  c("Nissan", "Juke", "adaptability", "common", 3, 2, 5, 2),
  c("Kia", "Niro", "adaptability", "common", 3, 2, 5, 2),
  c("Hyundai", "Kona", "adaptability", "common", 3, 2, 5, 2),
  c("Skoda", "Karoq", "adaptability", "common", 2, 3, 5, 2),
  c("VW", "T-Cross", "adaptability", "common", 2, 3, 5, 2),
  c("Opel", "Crossland", "adaptability", "common", 2, 3, 5, 2),
  c("Ford", "Puma", "adaptability", "common", 3, 2, 5, 2),
  c("Mazda", "CX-3", "adaptability", "common", 3, 2, 5, 2),
  c("Subaru", "XV", "adaptability", "common", 2, 3, 5, 2),
  c("Mitsubishi", "Eclipse Cross", "adaptability", "common", 2, 2, 6, 2),
  c("Suzuki", "Vitara", "adaptability", "common", 2, 3, 5, 2),
  c("Seat", "Arona", "adaptability", "common", 3, 2, 5, 2),
  c("Fiat", "500X", "adaptability", "common", 2, 2, 6, 2),
  c("Jeep", "Renegade", "adaptability", "common", 2, 3, 5, 2),
  c("MG", "ZS", "adaptability", "common", 3, 2, 5, 2),
  // 15 Uncommon
  c("Tesla", "Model 3", "adaptability", "uncommon", 4, 3, 7, 4),
  c("BMW", "i4", "adaptability", "uncommon", 4, 4, 7, 3),
  c("Audi", "Q5", "adaptability", "uncommon", 3, 4, 7, 4),
  c("Mercedes", "GLC", "adaptability", "uncommon", 3, 4, 7, 4),
  c("Volvo", "XC60", "adaptability", "uncommon", 3, 5, 7, 3),
  c("Porsche", "Macan", "adaptability", "uncommon", 5, 4, 6, 4),
  c("Jaguar", "E-Pace", "adaptability", "uncommon", 4, 4, 7, 3),
  c("Alfa Romeo", "Stelvio", "adaptability", "uncommon", 4, 3, 7, 4),
  c("Lexus", "NX", "adaptability", "uncommon", 3, 4, 7, 4),
  c("Infiniti", "QX50", "adaptability", "uncommon", 3, 4, 7, 4),
  c("Genesis", "GV70", "adaptability", "uncommon", 4, 4, 7, 3),
  c("DS", "7 Crossback", "adaptability", "uncommon", 3, 4, 7, 4),
  c("Maserati", "Grecale", "adaptability", "uncommon", 5, 3, 7, 4),
  c("Cupra", "Formentor", "adaptability", "uncommon", 5, 3, 7, 4),
  c("Polestar", "2", "adaptability", "uncommon", 4, 4, 7, 3),
  // 10 Rare
  c("Tesla", "Model S Plaid", "adaptability", "rare", 6, 5, 8, 6),
  c("Porsche", "Cayenne Turbo", "adaptability", "rare", 6, 5, 8, 6),
  c("BMW", "X5 M", "adaptability", "rare", 6, 6, 7, 6),
  c("Audi", "RS Q8", "adaptability", "rare", 6, 6, 7, 6),
  c("Mercedes", "GLE 63", "adaptability", "rare", 5, 6, 8, 6),
  c("Range Rover", "Sport SVR", "adaptability", "rare", 6, 6, 7, 6),
  c("Maserati", "Levante Trofeo", "adaptability", "rare", 6, 5, 8, 6),
  c("Aston Martin", "DBX", "adaptability", "rare", 5, 6, 8, 6),
  c("Ferrari", "Purosangue", "adaptability", "rare", 7, 5, 8, 5),
  c("Lotus", "Eletre", "adaptability", "rare", 6, 5, 8, 6),
  // 5 Mythic
  c("Rimac", "Nevera", "adaptability", "mythic", 9, 7, 9, 7),
  c("Tesla", "Roadster 2025", "adaptability", "mythic", 9, 7, 9, 7),
  c("Koenigsegg", "Gemera", "adaptability", "mythic", 8, 7, 10, 7),
  c("Aston Martin", "Valkyrie", "adaptability", "mythic", 9, 7, 9, 8),
  c("Pagani", "Utopia", "adaptability", "mythic", 8, 7, 10, 8),
];

// ---- POWER ARCHETYPE (50 cards) ----
const powerCards: GameCardDef[] = [
  // 20 Common
  c("Ford", "Mustang V6", "power", "common", 2, 3, 2, 5),
  c("Chevrolet", "Camaro LT", "power", "common", 3, 2, 2, 5),
  c("Dodge", "Challenger SXT", "power", "common", 2, 3, 2, 5),
  c("Pontiac", "Firebird", "power", "common", 2, 2, 3, 5),
  c("Mercury", "Cougar", "power", "common", 2, 3, 2, 5),
  c("Chrysler", "300", "power", "common", 2, 3, 2, 5),
  c("Buick", "Grand National", "power", "common", 3, 2, 2, 5),
  c("Oldsmobile", "442", "power", "common", 2, 2, 3, 5),
  c("Plymouth", "Barracuda", "power", "common", 2, 3, 2, 5),
  c("AMC", "Javelin", "power", "common", 2, 2, 3, 5),
  c("Holden", "Commodore", "power", "common", 3, 2, 2, 5),
  c("Vauxhall", "VXR8", "power", "common", 3, 2, 2, 5),
  c("HSV", "GTS", "power", "common", 3, 2, 2, 5),
  c("Ford", "Falcon XR6", "power", "common", 2, 2, 3, 5),
  c("Nissan", "Silvia S13", "power", "common", 3, 2, 2, 5),
  c("Mitsubishi", "Eclipse", "power", "common", 3, 2, 2, 5),
  c("Toyota", "Celica", "power", "common", 3, 2, 2, 5),
  c("Mazda", "RX-7 FC", "power", "common", 3, 2, 2, 5),
  c("Honda", "Prelude", "power", "common", 3, 2, 2, 5),
  c("Subaru", "Legacy GT", "power", "common", 2, 3, 2, 5),
  // 15 Uncommon
  c("Ford", "Mustang GT", "power", "uncommon", 4, 3, 3, 8),
  c("Chevrolet", "Camaro SS", "power", "uncommon", 4, 3, 3, 8),
  c("Dodge", "Challenger R/T", "power", "uncommon", 3, 4, 3, 8),
  c("Nissan", "GT-R", "power", "uncommon", 5, 3, 3, 7),
  c("Subaru", "WRX STI", "power", "uncommon", 4, 4, 3, 7),
  c("Mitsubishi", "Lancer Evo X", "power", "uncommon", 4, 3, 4, 7),
  c("BMW", "M3 E46", "power", "uncommon", 4, 4, 3, 7),
  c("Audi", "RS4 B7", "power", "uncommon", 4, 4, 3, 7),
  c("Mercedes", "C63 W204", "power", "uncommon", 4, 4, 3, 7),
  c("Lexus", "IS F", "power", "uncommon", 4, 4, 3, 7),
  c("Cadillac", "CTS-V", "power", "uncommon", 4, 3, 3, 8),
  c("Pontiac", "GTO", "power", "uncommon", 3, 4, 3, 8),
  c("Shelby", "GT350", "power", "uncommon", 4, 3, 4, 7),
  c("Mazda", "RX-7 FD", "power", "uncommon", 5, 3, 3, 7),
  c("Toyota", "Supra MK4", "power", "uncommon", 5, 3, 3, 7),
  // 10 Rare
  c("Dodge", "Challenger Hellcat", "power", "rare", 5, 5, 4, 9),
  c("Ford", "Mustang Shelby GT500", "power", "rare", 6, 4, 4, 9),
  c("Chevrolet", "Corvette Z06", "power", "rare", 6, 5, 4, 9),
  c("Nissan", "GT-R Nismo", "power", "rare", 6, 5, 5, 8),
  c("BMW", "M5 CS", "power", "rare", 6, 5, 5, 8),
  c("Audi", "RS6 Avant", "power", "rare", 5, 5, 5, 9),
  c("Mercedes", "E63 S", "power", "rare", 6, 5, 4, 9),
  c("Dodge", "Viper ACR", "power", "rare", 6, 4, 4, 10),
  c("Chevrolet", "Camaro ZL1", "power", "rare", 6, 5, 4, 9),
  c("Shelby", "Super Snake", "power", "rare", 5, 5, 4, 10),
  // 5 Mythic
  c("Koenigsegg", "Jesko", "power", "mythic", 9, 7, 7, 10),
  c("Hennessey", "Venom F5", "power", "mythic", 9, 7, 7, 10),
  c("SSC", "Tuatara", "power", "mythic", 9, 7, 7, 10),
  c("Lamborghini", "Aventador SVJ", "power", "mythic", 9, 8, 7, 10),
  c("Ferrari", "LaFerrari", "power", "mythic", 9, 8, 7, 10),
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
