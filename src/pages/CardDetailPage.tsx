import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CardCondition, CardArchetype } from "@/data/gameCards";
import { CONDITION_META, CONDITION_MODIFIERS } from "@/data/gameCards";
import { getCardImageKey, useCardImage } from "@/lib/cardImageUtils";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Coins,
  Heart,
  Zap,
  Shield,
  Brain,
  Sword,
  Wrench,
  FileText,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface GameCardRow {
  id: string;
  brand: string;
  model: string;
  name: string;
  archetype: string;
  rarity: string;
  speed: number;
  resilience: number;
  adaptability: number;
  power: number;
  hp: number;
}

interface UserCardInstance {
  id: string;
  condition: string | null;
}

const CONDITION_ORDER: CardCondition[] = ["damaged", "average", "good", "perfect"];
function bestCondition(conditions: (string | null)[]): CardCondition {
  let best: CardCondition = "good";
  for (const c of conditions) {
    if (!c) continue;
    const idx = CONDITION_ORDER.indexOf(c as CardCondition);
    if (idx > CONDITION_ORDER.indexOf(best)) best = c as CardCondition;
  }
  return best;
}

function repairCost(current: CardCondition): number {
  switch (current) {
    case "damaged": return 10;
    case "average": return 10;
    case "good": return 15;
    default: return 0;
  }
}

function nextCondition(current: CardCondition): CardCondition | null {
  switch (current) {
    case "damaged": return "average";
    case "average": return "good";
    case "good": return "perfect";
    default: return null;
  }
}

const POPUP_ARCHETYPE_FALLBACK: Record<string, { gradient: string; emoji: string }> = {
  speed: { gradient: "from-yellow-900/60 to-zinc-900", emoji: "⚡" },
  resilience: { gradient: "from-blue-900/60 to-zinc-900", emoji: "🛡️" },
  adaptability: { gradient: "from-cyan-900/60 to-zinc-900", emoji: "🧠" },
  power: { gradient: "from-red-900/60 to-zinc-900", emoji: "⚔️" },
};

export default function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { coins, refetchOwned } = useTheme();
  const queryClient = useQueryClient();
  const [card, setCard] = useState<GameCardRow | null>(null);
  const [instances, setInstances] = useState<UserCardInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairingId, setRepairingId] = useState<string | null>(null);

  const bestCond = bestCondition(instances.map((i) => i.condition));
  const mod = CONDITION_MODIFIERS[bestCond];
  const effectiveSpeed = Math.round((card?.speed ?? 0) * mod);
  const effectiveResilience = Math.round((card?.resilience ?? 0) * mod);
  const effectiveAdaptability = Math.round((card?.adaptability ?? 0) * mod);
  const effectivePower = Math.round((card?.power ?? 0) * mod);

  const fetchData = useCallback(async () => {
    if (!user?.id || !cardId) return;
    const [cardRes, instancesRes] = await Promise.all([
      supabase.from("game_cards").select("*").eq("id", cardId).maybeSingle(),
      supabase.from("user_game_cards").select("id, condition").eq("user_id", user.id).eq("card_id", cardId),
    ]);
    setCard((cardRes.data as GameCardRow) ?? null);
    setInstances((instancesRes.data as UserCardInstance[]) ?? []);
  }, [user?.id, cardId]);

  useEffect(() => {
    if (!user || !cardId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [user, cardId, fetchData]);

  const handleRepair = async (instanceId: string, currentCondition: CardCondition) => {
    const cost = repairCost(currentCondition);
    if (coins < cost) {
      toast.error(t.card_repair_insufficient as string);
      return;
    }
    setRepairingId(instanceId);
    try {
      const { data } = await supabase.rpc("repair_card", { p_user_game_card_id: instanceId });
      const result = data as { ok?: boolean; error?: string } | null;
      if (result?.ok) {
        await queryClient.invalidateQueries({ queryKey: ["profile-coins", user?.id] });
        await refetchOwned();
        await fetchData();
        toast.success(t.card_repair_success as string);
      } else {
        const errKey = result?.error === "insufficient_coins" ? "card_repair_insufficient" : "error";
        toast.error((t[errKey as keyof typeof t] as string) || result?.error || "Error");
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setRepairingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">{t.card_not_found as string}</p>
        <Button variant="outline" onClick={() => navigate("/card-game")}>
          {t.back as string}
        </Button>
      </div>
    );
  }

  const model = card.model ?? (card.name.replace(new RegExp(`^${card.brand}\\s+`), "").trim() || card.name);
  const RARITY_LABELS: Record<string, string> = {
    common: t.game_common as string,
    uncommon: t.game_uncommon as string,
    rare: t.game_rare as string,
    mythic: t.game_mythic as string,
  };
  const RARITY_BORDER: Record<string, string> = {
    common: "border-zinc-500",
    uncommon: "border-emerald-500",
    rare: "border-violet-500",
    mythic: "border-amber-400",
  };
  const stats = [
    { icon: Zap, label: t.game_speed as string, value: effectiveSpeed, color: "text-yellow-500", bg: "bg-yellow-500" },
    { icon: Shield, label: t.game_resilience as string, value: effectiveResilience, color: "text-blue-500", bg: "bg-blue-500" },
    { icon: Brain, label: t.game_adaptability as string, value: effectiveAdaptability, color: "text-cyan-500", bg: "bg-cyan-500" },
    { icon: Sword, label: t.game_power as string, value: effectivePower, color: "text-red-500", bg: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/card-game")} className="shrink-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-lg font-bold truncate">{model}</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Card visual + name + rarity */}
        <section className={`rounded-2xl border-2 ${RARITY_BORDER[card.rarity] ?? "border-border"} bg-card overflow-hidden`}>
          <div className="relative aspect-[3/4] max-h-[320px] flex items-center justify-center bg-muted/30">
            <CardImageBlock brand={card.brand} model={model} archetype={card.archetype as CardArchetype} condition={bestCond} />
          </div>
          <div className="p-4 text-center">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${card.rarity === "mythic" ? "text-amber-400 border-amber-400" : "text-muted-foreground border-border"}`}>
              {RARITY_LABELS[card.rarity] ?? card.rarity}
            </span>
            <p className="text-xs text-muted-foreground uppercase mt-2">{card.brand}</p>
            <h2 className="text-xl font-bold mt-0.5">{model}</h2>
            <p className="flex items-center justify-center gap-1.5 mt-1.5 text-sm text-red-400 font-bold">
              <Heart className="h-4 w-4 fill-red-500 text-red-500" /> {card.hp} HP
            </p>
          </div>
        </section>

        {/* Stats zone (free for now) */}
        <section>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t.card_stats_zone as string}
          </h3>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs text-muted-foreground mb-2">
              {(t.card_stats_best_condition as string)?.replace("{}", (t as Record<string, string>)[`card_condition_${bestCond}`] ?? bestCond)}
            </p>
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color} shrink-0`} />
                <span className="text-sm text-muted-foreground w-24 shrink-0">{s.label}</span>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.bg}`} style={{ width: `${Math.min(100, s.value * 10)}%` }} />
                </div>
                <span className="text-sm font-bold w-6 text-right">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* State / repair zone */}
        <section>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-primary" />
            {t.card_state_zone as string}
          </h3>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.card_no_copies as string}</p>
            ) : (
              <div className="space-y-2">
                {instances.map((inst) => {
                  const cond = (inst.condition ?? "good") as CardCondition;
                  const next = nextCondition(cond);
                  const cost = repairCost(cond);
                  const canRepair = next !== null && coins >= cost;
                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-bold uppercase ${CONDITION_META[cond].badgeClass}`}>
                        {CONDITION_META[cond].emoji} {(t as Record<string, string>)[`card_condition_${cond}`]}
                      </div>
                      {next ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          disabled={!canRepair || repairingId === inst.id}
                          onClick={() => handleRepair(inst.id, cond)}
                        >
                          {repairingId === inst.id ? (
                            <span className="animate-pulse">…</span>
                          ) : (
                            <>
                              <Coins className="h-3.5 w-3.5" />
                              {cost} → {(t as Record<string, string>)[`card_condition_${next}`]}
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-primary font-medium">✓ {(t.card_perfect as string)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              {t.card_repair_cost_hint as string}
            </p>
          </div>
        </section>

        {/* Description zone */}
        <section>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            {t.card_description_zone as string}
          </h3>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p><span className="text-muted-foreground text-sm">{t.card_brand as string}:</span> <span className="font-medium">{card.brand}</span></p>
            <p><span className="text-muted-foreground text-sm">{t.card_model as string}:</span> <span className="font-medium">{model}</span></p>
            <p><span className="text-muted-foreground text-sm">{t.card_archetype as string}:</span> <span className="font-medium capitalize">{card.archetype}</span></p>
          </div>
        </section>
      </div>
    </div>
  );
}

function CardImageBlock({
  brand,
  model,
  archetype,
  condition,
}: {
  brand: string;
  model: string;
  archetype: CardArchetype;
  condition: CardCondition;
}) {
  const key = getCardImageKey(brand, model);
  const { url, loaded, error } = useCardImage(key);
  const filter = {
    damaged: "saturate(0.25) brightness(0.80) contrast(0.90)",
    average: "saturate(0.75) sepia(0.15) brightness(0.95)",
    good: "none",
    perfect: "brightness(1.08) contrast(1.05) saturate(1.1)",
  }[condition];

  if (loaded && !error && url) {
    return (
      <img
        src={url}
        alt={`${brand} ${model}`}
        className="max-w-full max-h-full w-auto h-auto object-contain object-center"
        style={{ filter: filter !== "none" ? filter : undefined }}
      />
    );
  }
  const fallback = POPUP_ARCHETYPE_FALLBACK[archetype];
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${fallback?.gradient ?? "from-zinc-800 to-zinc-900"} flex items-center justify-center rounded-b-xl`}>
      <span className="text-5xl opacity-80">{fallback?.emoji ?? "🚗"}</span>
    </div>
  );
}
