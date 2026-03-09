import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "./GameCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface CardData {
  id: string;
  name: string;
  brand: string;
  model: string;
  rarity: "common" | "uncommon" | "rare" | "mythic";
  archetype: "speed" | "resilience" | "adaptability" | "power";
  speed: number;
  resilience: number;
  adaptability: number;
  power: number;
  hp: number;
}

interface BoosterPackProps {
  cards: CardData[];
  onDone: () => void;
}

export function BoosterPack({ cards, onDone }: BoosterPackProps) {
  const { t } = useLanguage();
  const [revealedCount, setRevealedCount] = useState(0);
  const allRevealed = revealedCount >= cards.length;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <h2 className="text-lg font-bold text-foreground">{t.game_booster_opening as string}</h2>

      <div className="flex flex-wrap justify-center gap-3">
        {cards.map((card, i) => {
          const isRevealed = i < revealedCount;
          return (
            <AnimatePresence key={card.id} mode="wait">
              {isRevealed ? (
                <motion.div
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <GameCard {...card} />
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GameCard
                    {...card}
                    flipped
                    onClick={() => setRevealedCount(Math.max(revealedCount, i + 1))}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
      </div>

      {!allRevealed && (
        <Button variant="outline" size="sm" onClick={() => setRevealedCount(cards.length)}>
          {t.game_reveal_all as string}
        </Button>
      )}

      {allRevealed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={onDone}>{t.game_back_collection as string}</Button>
        </motion.div>
      )}
    </div>
  );
}
