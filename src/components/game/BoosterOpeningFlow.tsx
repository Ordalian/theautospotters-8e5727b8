import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "./GameCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { Package, Zap, Shield, Brain, Sword } from "lucide-react";
import type { GameCardDef } from "@/data/gameCards";
import type { CardCondition } from "@/data/gameCards";

export type Phase = "pick" | "anticipation" | "tear" | "reveal_all" | "summary" | "back";

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
}

type Action =
  | { type: "SELECT_PACK"; pack: Pack }
  | { type: "START_TEAR" }
  | { type: "TEAR_DONE"; cards: DrawnCard[] }
  | { type: "GO_SUMMARY" }
  | { type: "GO_BACK" };

const initialState: BoosterOpeningState = {
  phase: "pick",
  selectedPack: null,
  drawnCards: [],
};

function reducer(state: BoosterOpeningState, action: Action): BoosterOpeningState {
  switch (action.type) {
    case "SELECT_PACK":
      return { ...state, selectedPack: action.pack, phase: "anticipation" };
    case "START_TEAR":
      return { ...state, phase: "tear" };
    case "TEAR_DONE":
      return { ...state, phase: "reveal_all", drawnCards: action.cards };
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
  onOpenPack: (packId: string) => Promise<DrawnCard[]>;
  onComplete: (cards: DrawnCard[]) => void;
}

const ANTICIPATION_MS = 1200;

const PACK_ICON: Record<string, typeof Zap> = {
  speed: Zap,
  resilience: Shield,
  adaptability: Brain,
  power: Sword,
};

const PACK_GRADIENT: Record<string, string> = {
  speed: "from-amber-500/15 to-amber-600/5",
  resilience: "from-emerald-500/15 to-emerald-600/5",
  adaptability: "from-violet-500/15 to-violet-600/5",
  power: "from-red-500/15 to-red-600/5",
};

const PACK_ACCENT: Record<string, string> = {
  speed: "border-amber-500/30 text-amber-500",
  resilience: "border-emerald-500/30 text-emerald-500",
  adaptability: "border-violet-500/30 text-violet-500",
  power: "border-red-500/30 text-red-500",
};

export function BoosterOpeningFlow({ packs, onOpenPack, onComplete }: BoosterOpeningFlowProps) {
  const { t } = useLanguage();
  const [state, dispatch] = useReducer(reducer, initialState);
  const tearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anticipationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tx = t as Record<string, string | ((...args: unknown[]) => string)>;

  const handlePackSelect = useCallback((pack: Pack) => {
    dispatch({ type: "SELECT_PACK", pack });
  }, []);

  useEffect(() => {
    if (state.phase !== "anticipation") return;
    anticipationRef.current = setTimeout(() => dispatch({ type: "START_TEAR" }), ANTICIPATION_MS);
    return () => { if (anticipationRef.current) clearTimeout(anticipationRef.current); };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "tear" || !state.selectedPack) return;
    const packId = state.selectedPack.id;
    tearTimeoutRef.current = setTimeout(() => {
      onOpenPack(packId).then((cards) => dispatch({ type: "TEAR_DONE", cards }));
    }, 800);
    return () => { if (tearTimeoutRef.current) clearTimeout(tearTimeoutRef.current); };
  }, [state.phase, state.selectedPack, onOpenPack]);

  const handleContinue = useCallback(() => {
    onComplete(state.drawnCards);
    dispatch({ type: "GO_BACK" });
  }, [onComplete, state.drawnCards]);

  if (state.phase === "back") return null;

  const packId = state.selectedPack?.id ?? "speed";
  const PackIcon = PACK_ICON[packId] ?? Package;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Phase 1 — Pick pack */}
        {state.phase === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-6 w-full max-w-md"
          >
            <h2 className="font-heading text-xl font-bold text-foreground text-center mb-1 tracking-tight">
              {typeof tx.booster_phase_pick_title === "string" ? tx.booster_phase_pick_title : "Choisis un pack"}
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-6 max-w-xs mx-auto">
              {typeof tx.booster_rares_mythic_hint === "string" ? tx.booster_rares_mythic_hint : "Common & Uncommon: all types. Rare & Mythic: this type only."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {packs.map((pack) => {
                const Icon = PACK_ICON[pack.id] ?? Package;
                const gradient = PACK_GRADIENT[pack.id] ?? "from-primary/10 to-primary/5";
                const accent = PACK_ACCENT[pack.id] ?? "border-primary/30 text-primary";
                return (
                  <motion.button
                    key={pack.id}
                    type="button"
                    onClick={() => handlePackSelect(pack)}
                    className={`relative aspect-[3/4] rounded-2xl border bg-card p-4 flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${accent.split(" ")[0]}`}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}>
                      <Icon className={`h-8 w-8 ${accent.split(" ").slice(1).join(" ")}`} />
                    </div>
                    <span className="font-heading text-sm font-bold text-foreground tracking-tight">
                      {pack.name}
                    </span>
                    <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-card ${accent}`}>
                      {typeof tx.booster_pack_remaining === "function"
                        ? tx.booster_pack_remaining(pack.count)
                        : `${pack.count}`}
                    </span>
                  </motion.button>
                );
              })}
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
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-[200px] aspect-[3/4] rounded-2xl border border-primary/30 bg-card flex flex-col items-center justify-center gap-3 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.25)]"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <PackIcon className="h-12 w-12 text-primary" />
              </motion.div>
              <span className="font-heading text-base font-bold text-foreground tracking-tight">{state.selectedPack.name}</span>
            </motion.div>
            <motion.p
              className="mt-6 text-sm text-muted-foreground"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              {typeof tx.game_booster_opening === "string" ? tx.game_booster_opening : "Ouverture…"}
            </motion.p>
          </motion.div>
        )}

        {/* Phase 3 — Tear */}
        {state.phase === "tear" && state.selectedPack && (
          <TearPhase key="tear" packName={state.selectedPack.name} packId={state.selectedPack.id} />
        )}

        {/* Phase 4 — Reveal all */}
        {state.phase === "reveal_all" && state.drawnCards.length > 0 && state.selectedPack && (
          <motion.div
            key="reveal_all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-4"
          >
            {/* Cards fanned out — scaled down to fit mobile */}
            <div className="flex justify-center items-end gap-0.5 mb-4 scale-[0.7] sm:scale-[0.85] origin-bottom" style={{ perspective: "800px" }}>
              {state.drawnCards.map((card, i) => {
                const n = state.drawnCards.length;
                const spread = 18;
                const baseRotate = (i - (n - 1) / 2) * spread;
                const yOffset = Math.abs(i - (n - 1) / 2) * 8;
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 60, rotateY: -30 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: 0.12 * i, duration: 0.4, ease: "easeOut" }}
                    style={{
                      transform: `translateY(${-yOffset}px) rotate(${baseRotate}deg)`,
                      transformStyle: "preserve-3d",
                      marginLeft: i > 0 ? "-16px" : "0",
                    }}
                    className="origin-bottom"
                  >
                    <GameCard {...card} condition={card.condition} />
                  </motion.div>
                );
              })}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4"
            >
              <Button onClick={() => dispatch({ type: "GO_SUMMARY" })} size="lg" className="font-heading font-bold tracking-tight rounded-xl px-8">
                {typeof tx.booster_tap_to_continue === "string" ? tx.booster_tap_to_continue : "Continuer"}
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Phase 5 — Summary */}
        {state.phase === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-6 pb-24 w-full max-w-2xl overflow-y-auto max-h-screen"
          >
            <h2 className="font-heading text-xl font-bold text-foreground text-center mb-1 tracking-tight">
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
                  transition={{ delay: i * 0.08, duration: 0.3 }}
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
              <Button onClick={handleContinue} size="lg" className="font-heading font-bold tracking-tight rounded-xl px-8">
                {typeof tx.booster_continue === "string" ? tx.booster_continue : "Continuer"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TearPhase({ packName, packId }: { packName: string; packId: string }) {
  const [flashDone, setFlashDone] = useState(false);
  const [tearDone, setTearDone] = useState(false);
  const PackIcon = PACK_ICON[packId] ?? Package;

  useEffect(() => {
    const t1 = setTimeout(() => setFlashDone(true), 200);
    const t2 = setTimeout(() => setTearDone(true), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Flash */}
      <motion.div
        className="absolute inset-0 bg-primary/20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.25 }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[200px] aspect-[3/4]">
          {/* Top half */}
          <motion.div
            className="absolute inset-0 rounded-2xl border border-primary/20 bg-card flex flex-col items-center justify-center overflow-hidden"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)" }}
            initial={{ y: 0, rotate: 0 }}
            animate={{ y: tearDone ? "-120%" : 0, rotate: tearDone ? -6 : 0 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          >
            <PackIcon className="h-10 w-10 text-primary/60" />
            <span className="font-heading text-sm font-bold mt-2 text-foreground">{packName}</span>
          </motion.div>
          {/* Bottom half */}
          <motion.div
            className="absolute inset-0 rounded-2xl border border-primary/20 bg-card flex flex-col items-center justify-center overflow-hidden"
            style={{ clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)" }}
            initial={{ y: 0, rotate: 0 }}
            animate={{ y: tearDone ? "120%" : 0, rotate: tearDone ? 6 : 0 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          >
            <PackIcon className="h-10 w-10 text-primary/60" />
            <span className="font-heading text-sm font-bold mt-2 text-foreground">{packName}</span>
          </motion.div>
        </div>
      </div>
      {/* Particles */}
      {flashDone && <Particles count={12} />}
    </div>
  );
}

function Particles({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-primary"
          style={{
            left: "50%",
            top: "50%",
            boxShadow: "0 0 6px hsl(var(--primary) / 0.6)",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 220,
            y: (Math.random() - 0.5) * 220,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
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
      ? "shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
      : isRare
        ? "shadow-[0_0_20px_rgba(139,92,246,0.35)]"
        : "";

  return (
    <>
      {isMythic && (
        <motion.div
          className="fixed inset-0 bg-background/60 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: showFront ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
      {isMythic && showFront && <Particles count={14} />}
      {isRare && showFront && <Particles count={6} />}
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
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-card cursor-pointer"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            onClick={(e) => { e.stopPropagation(); handleTapBack(); }}
            onKeyDown={(e) => e.key === "Enter" && handleTapBack()}
            role="button"
            tabIndex={0}
          >
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </motion.div>
        {canTapNext && (
          <motion.p
            className="mt-4 text-sm text-muted-foreground text-center"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {tapLabel}
          </motion.p>
        )}
      </motion.div>
    </>
  );
}
