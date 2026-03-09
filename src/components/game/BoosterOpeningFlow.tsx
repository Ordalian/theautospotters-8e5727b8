import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "./GameCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import type { GameCardDef } from "@/data/gameCards";
import type { CardCondition } from "@/data/gameCards";

export type Phase = "pick" | "anticipation" | "tear" | "reveal" | "summary" | "back";

export interface Pack {
  id: string;
  name: string;
  count: number;
}

export interface DrawnCard extends GameCardDef {
  id: string;
  condition: CardCondition;
}

interface BoosterOpeningState {
  phase: Phase;
  selectedPack: Pack | null;
  drawnCards: DrawnCard[];
  currentCardIndex: number;
  isFlipping: boolean;
  tearDone: boolean;
  mythicExtraShown: boolean;
}

type Action =
  | { type: "SELECT_PACK"; pack: Pack }
  | { type: "START_ANTICIPATION" }
  | { type: "START_TEAR" }
  | { type: "TEAR_DONE"; cards: DrawnCard[] }
  | { type: "NEXT_CARD" }
  | { type: "FLIP_START" }
  | { type: "FLIP_END" }
  | { type: "MYTHIC_EXTRA_DONE" }
  | { type: "GO_SUMMARY" }
  | { type: "GO_BACK" };

const initialState: BoosterOpeningState = {
  phase: "pick",
  selectedPack: null,
  drawnCards: [],
  currentCardIndex: 0,
  isFlipping: false,
  tearDone: false,
  mythicExtraShown: false,
};

function reducer(state: BoosterOpeningState, action: Action): BoosterOpeningState {
  switch (action.type) {
    case "SELECT_PACK":
      return { ...state, selectedPack: action.pack, phase: "anticipation" };
    case "START_ANTICIPATION":
      return state;
    case "START_TEAR":
      return { ...state, phase: "tear" };
    case "TEAR_DONE":
      return { ...state, phase: "reveal", drawnCards: action.cards, tearDone: true };
    case "NEXT_CARD":
      return { ...state, currentCardIndex: state.currentCardIndex + 1, isFlipping: false, mythicExtraShown: false };
    case "FLIP_START":
      return { ...state, isFlipping: true };
    case "FLIP_END":
      return { ...state, isFlipping: false };
    case "MYTHIC_EXTRA_DONE":
      return { ...state, mythicExtraShown: true };
    case "GO_SUMMARY":
      return { ...state, phase: "summary" };
    case "GO_BACK":
      return { ...state, phase: "back" };
    default:
      return state;
  }
}

interface BoosterOpeningFlowProps {
  packs: Pack[];
  onOpenPack: () => Promise<DrawnCard[]>;
  onComplete: (cards: DrawnCard[]) => void;
}

const PACK_ROTATION = () => (Math.random() * 6 - 3);

export function BoosterOpeningFlow({ packs, onOpenPack, onComplete }: BoosterOpeningFlowProps) {
  const { t } = useLanguage();
  const [state, dispatch] = useReducer(reducer, initialState);
  const tearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mythicExtraRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tx = t as Record<string, string | ((...args: unknown[]) => string)>;

  const handlePackSelect = useCallback(
    (pack: Pack) => {
      dispatch({ type: "SELECT_PACK", pack });
    },
    []
  );

  const handleTapToOpen = useCallback(() => {
    dispatch({ type: "START_TEAR" });
  }, []);

  useEffect(() => {
    if (state.phase !== "tear") return;
    tearTimeoutRef.current = setTimeout(() => {
      onOpenPack().then((cards) => {
        dispatch({ type: "TEAR_DONE", cards });
      });
    }, 800);
    return () => {
      if (tearTimeoutRef.current) clearTimeout(tearTimeoutRef.current);
    };
  }, [state.phase, onOpenPack]);

  const currentCard = state.drawnCards[state.currentCardIndex];
  const isMythic = currentCard?.rarity === "mythic";
  const allRevealed = state.drawnCards.length > 0 && state.currentCardIndex >= state.drawnCards.length;
  const canTapNext =
    state.phase === "reveal" &&
    currentCard &&
    !state.isFlipping &&
    (isMythic ? state.mythicExtraShown : true);

  const handleRevealTap = useCallback(() => {
    if (!canTapNext) return;
    if (state.currentCardIndex + 1 >= state.drawnCards.length) {
      dispatch({ type: "GO_SUMMARY" });
    } else {
      dispatch({ type: "NEXT_CARD" });
    }
  }, [canTapNext, state.currentCardIndex, state.drawnCards.length]);

  useEffect(() => {
    if (state.phase !== "reveal" || !currentCard || currentCard.rarity !== "mythic" || state.isFlipping) return;
    if (state.mythicExtraShown) return;
    mythicExtraRef.current = setTimeout(() => dispatch({ type: "MYTHIC_EXTRA_DONE" }), 1500);
    return () => {
      if (mythicExtraRef.current) clearTimeout(mythicExtraRef.current);
    };
  }, [state.phase, currentCard?.id, currentCard?.rarity, state.isFlipping, state.mythicExtraShown]);

  const handleContinue = useCallback(() => {
    onComplete(state.drawnCards);
    dispatch({ type: "GO_BACK" });
  }, [onComplete, state.drawnCards]);

  if (state.phase === "back") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Phase 1 — Pick pack */}
        {state.phase === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-6 w-full max-w-md"
          >
            <h2 className="text-lg font-bold uppercase tracking-wider text-foreground text-center mb-6">
              {typeof tx.booster_phase_pick_title === "string" ? tx.booster_phase_pick_title : "Choisis un pack"}
            </h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 justify-items-center">
              {packs.map((pack) => (
                <motion.button
                  key={pack.id}
                  type="button"
                  onClick={() => handlePackSelect(pack)}
                  className="relative w-full max-w-[200px] aspect-[3/4] rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-zinc-900 to-zinc-800 shadow-lg flex flex-col items-center justify-center p-4 hover:border-amber-500/70 hover:scale-[1.02] transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-5xl mb-2">🏎️</span>
                  <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {pack.name}
                  </span>
                  <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    {typeof tx.booster_pack_remaining === "function"
                      ? tx.booster_pack_remaining(pack.count)
                      : `${pack.count}`}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 2 — Anticipation */}
        {state.phase === "anticipation" && state.selectedPack && (
          <motion.div
            key="anticipation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-4"
            onClick={handleTapToOpen}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{
                scale: 1,
                rotate: PACK_ROTATION(),
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`relative w-[220px] aspect-[3/4] rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-zinc-900 to-zinc-800 shadow-xl flex flex-col items-center justify-center p-6 booster-shake booster-glow-pulse`}
            >
              <span className="text-6xl mb-2">🏎️</span>
              <span className="text-base font-bold uppercase tracking-wider text-foreground">
                {state.selectedPack.name}
              </span>
            </motion.div>
            <motion.p
              className="mt-8 text-sm text-muted-foreground booster-tap-blink"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              {typeof tx.booster_tap_to_open === "string" ? tx.booster_tap_to_open : "Appuie pour ouvrir"}
            </motion.p>
          </motion.div>
        )}

        {/* Phase 3 — Tear */}
        {state.phase === "tear" && state.selectedPack && (
          <TearPhase key="tear" packName={state.selectedPack.name} />
        )}

        {/* Phase 4 — Reveal card by card */}
        {state.phase === "reveal" && state.drawnCards.length > 0 && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-4"
          >
            {currentCard && (
              <RevealCard
                card={currentCard}
                isFlipping={state.isFlipping}
                onFlipStart={() => dispatch({ type: "FLIP_START" })}
                onFlipEnd={() => dispatch({ type: "FLIP_END" })}
                onTapNext={handleRevealTap}
                canTapNext={canTapNext}
                tapLabel={typeof tx.booster_tap_to_continue === "string" ? tx.booster_tap_to_continue : "Tap pour continuer"}
              />
            )}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
              {state.drawnCards.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${i < state.currentCardIndex ? "bg-amber-500" : "bg-zinc-600"}`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 5 — Summary */}
        {state.phase === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-6 pb-24 w-full max-w-2xl"
          >
            <h2 className="text-lg font-bold uppercase tracking-wider text-foreground text-center mb-1">
              {typeof tx.booster_summary_title === "string" ? tx.booster_summary_title : "Tes nouvelles cartes !"}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {typeof tx.booster_summary_subtitle === "function" &&
                tx.booster_summary_subtitle(
                  state.drawnCards.filter((c) => c.rarity === "common").length,
                  state.drawnCards.filter((c) => c.rarity === "uncommon").length,
                  state.drawnCards.filter((c) => c.rarity === "rare").length,
                  state.drawnCards.filter((c) => c.rarity === "mythic").length
                )}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {state.drawnCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                >
                  <GameCard {...card} condition={card.condition} />
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center mt-8"
            >
              <Button onClick={handleContinue} size="lg" className="uppercase tracking-wider">
                {typeof tx.booster_continue === "string" ? tx.booster_continue : "Continuer"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TearPhase({ packName }: { packName: string }) {
  const [flashDone, setFlashDone] = useState(false);
  const [tearDone, setTearDone] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFlashDone(true), 200);
    const t2 = setTimeout(() => setTearDone(true), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.2 }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[220px] aspect-[3/4]">
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-zinc-900 to-zinc-800 flex flex-col items-center justify-center overflow-hidden"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)" }}
            initial={{ y: 0, rotate: 0 }}
            animate={{ y: tearDone ? "-120%" : 0, rotate: tearDone ? -8 : 0 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          >
            <span className="text-5xl">🏎️</span>
            <span className="text-sm font-bold uppercase">{packName}</span>
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-zinc-900 to-zinc-800 flex flex-col items-center justify-center overflow-hidden"
            style={{ clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)" }}
            initial={{ y: 0, rotate: 0 }}
            animate={{ y: tearDone ? "120%" : 0, rotate: tearDone ? 8 : 0 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          >
            <span className="text-5xl">🏎️</span>
            <span className="text-sm font-bold uppercase">{packName}</span>
          </motion.div>
        </div>
      </div>
      {flashDone && (
        <Particles count={10} color="rgba(245, 158, 11, 0.9)" />
      )}
    </div>
  );
}

function Particles({ count, color }: { count: number; color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: "50%",
            top: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            opacity: 0,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

interface RevealCardProps {
  card: DrawnCard;
  isFlipping: boolean;
  onFlipStart: () => void;
  onFlipEnd: () => void;
  onTapNext: () => void;
  canTapNext: boolean;
  tapLabel: string;
}

function RevealCard({ card, isFlipping, onFlipStart, onFlipEnd, onTapNext, canTapNext, tapLabel }: RevealCardProps) {
  const [showFront, setShowFront] = useState(false);
  const isMythic = card.rarity === "mythic";
  const isRare = card.rarity === "rare";
  const isUncommon = card.rarity === "uncommon";

  const handleTapBack = useCallback(() => {
    if (showFront || isFlipping) return;
    onFlipStart();
    setTimeout(() => {
      setShowFront(true);
      onFlipEnd();
    }, 400);
  }, [showFront, isFlipping, onFlipStart, onFlipEnd]);

  const glowClass =
    isMythic
      ? "shadow-[0_0_40px_rgba(245,158,11,0.6)]"
      : isRare
        ? "shadow-[0_0_28px_rgba(139,92,246,0.5)]"
        : isUncommon
          ? "shadow-[0_0_20px_rgba(52,211,153,0.4)]"
          : "";

  return (
    <>
      {isMythic && (
        <motion.div
          className="fixed inset-0 bg-black/50 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: showFront ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
      {isMythic && showFront && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              border: "2px solid rgba(245, 158, 11, 0.6)",
              borderRadius: "50%",
              width: 200,
              height: 200,
            }}
          />
          <Particles count={12} color="rgba(245, 158, 11, 0.9)" />
        </>
      )}
      {isRare && showFront && <Particles count={6} color="rgba(139, 92, 246, 0.8)" />}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10"
        onClick={canTapNext ? onTapNext : undefined}
        style={{ cursor: canTapNext ? "pointer" : "default" }}
      >
        <motion.div
          animate={{ rotateY: showFront ? 0 : 180 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformStyle: "preserve-3d", perspective: 1000 }}
          className={`relative w-[140px] h-[200px] ${glowClass}`}
        >
          <div
            className="absolute inset-0 cursor-pointer"
            style={{ backfaceVisibility: "hidden" }}
            onClick={showFront ? undefined : handleTapBack}
            onKeyDown={showFront ? undefined : (e) => e.key === "Enter" && handleTapBack()}
            role="button"
            tabIndex={showFront ? -1 : 0}
          >
            <GameCard {...card} condition={card.condition} />
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-muted bg-gradient-to-br from-zinc-800 to-zinc-900 cursor-pointer"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            onClick={(e) => { e.stopPropagation(); handleTapBack(); }}
            onKeyDown={(e) => e.key === "Enter" && handleTapBack()}
            role="button"
            tabIndex={0}
          >
            <span className="text-4xl">🏎️</span>
          </div>
        </motion.div>
        {canTapNext && (
          <motion.p
            className="mt-4 text-sm text-muted-foreground text-center booster-tap-blink"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {tapLabel}
          </motion.p>
        )}
      </motion.div>
    </>
  );
}
