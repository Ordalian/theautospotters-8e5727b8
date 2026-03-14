import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GameCard } from "./GameCard";
import type { CardRarity, CardCondition, CardArchetype } from "@/data/gameCards";
import type { TeamColor } from "./TeamSelector";
import { TEAMS } from "./TeamSelector";
import { Shield, Sword, Brain, X, Clock, Lock } from "lucide-react";
import { toast } from "sonner";

interface POIDetailProps {
  poi: {
    id: string;
    name: string;
    owner_team: string | null;
    invulnerable_until: string | null;
    image_url?: string | null;
  };
  userTeam: TeamColor;
  userId: string;
  isNearby: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface BattleRow {
  id: string;
  phase: string;
  ends_at: string;
  resolved: boolean;
  winner_team: string | null;
}

interface BattleCardRow {
  id: string;
  team_color: string;
  side: string;
  stat_value: number;
  user_id: string;
  user_game_card_id: string;
}

interface OwnedCard {
  id: string;
  card_id: string;
  condition: string | null;
  game_cards: {
    id: string;
    name: string;
    brand: string;
    model: string;
    rarity: string;
    archetype: string;
    speed: number;
    resilience: number;
    adaptability: number;
    power: number;
    hp: number;
  } | null;
}

const TEAM_HEX: Record<string, string> = { blue: "#3b82f6", red: "#ef4444", green: "#22c55e", black: "#1e1e1e" };

export function POIDetail({ poi, userTeam, userId, isNearby, onClose, onRefresh }: POIDetailProps) {
  const { t } = useLanguage();
  const [battle, setBattle] = useState<BattleRow | null>(null);
  const [battleCards, setBattleCards] = useState<BattleCardRow[]>([]);
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [countdown, setCountdown] = useState("");

  const isInvulnerable = poi.invulnerable_until && new Date(poi.invulnerable_until) > new Date();
  const isOwned = !!poi.owner_team;
  const isOwnTeam = poi.owner_team === userTeam;

  // Load battle + cards
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: battles } = await supabase
        .from("poi_battles")
        .select("id, phase, ends_at, resolved, winner_team")
        .eq("poi_id", poi.id)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(1) as any;

      const activeBattle = (battles as BattleRow[] | null)?.[0] ?? null;

      // Auto-resolve if expired
      if (activeBattle && new Date(activeBattle.ends_at) <= new Date()) {
        const { data } = await supabase.rpc("resolve_poi_battle", { p_battle_id: activeBattle.id }) as any;
        const res = data as { ok: boolean; winner?: string } | null;
        if (res?.ok) {
          toast.success(`${t.wdom_battle_resolved as string} — ${res.winner ?? "?"}`);
          onRefresh();
          setLoading(false);
          return;
        }
      }

      setBattle(activeBattle);

      if (activeBattle) {
        const { data: cards } = await supabase
          .from("poi_battle_cards")
          .select("id, team_color, side, stat_value, user_id, user_game_card_id")
          .eq("battle_id", activeBattle.id) as any;
        setBattleCards((cards as BattleCardRow[] | null) ?? []);
      }

      // Load user's available cards
      const { data: owned } = await supabase
        .from("user_game_cards")
        .select("id, card_id, condition, game_cards(id, name, brand, model, rarity, archetype, speed, resilience, adaptability, power, hp)")
        .eq("user_id", userId) as any;
      setOwnedCards((owned as OwnedCard[] | null) ?? []);
      setLoading(false);
    })();
  }, [poi.id, userId]);

  // Countdown timer
  useEffect(() => {
    if (!battle) { setCountdown(""); return; }
    const tick = () => {
      const diff = new Date(battle.ends_at).getTime() - Date.now();
      if (diff <= 0) { setCountdown(t.wdom_battle_ended as string ?? "Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [battle]);

  // Cards already placed by user's team in current battle
  const teamCardsPlaced = useMemo(() =>
    battleCards.filter((c) => c.team_color === userTeam),
    [battleCards, userTeam]
  );
  const userCardsPlaced = useMemo(() =>
    battleCards.filter((c) => c.user_id === userId),
    [battleCards, userId]
  );

  // Calculate limits
  const phase = battle?.phase ?? "capture";
  const maxPerTeam = phase === "capture" ? 30 : (isOwnTeam ? 30 : 8);
  const canPlace = isNearby && battle && teamCardsPlaced.length < maxPerTeam;

  // Cards not already in this battle
  const availableCards = useMemo(() => {
    const placedIds = new Set(battleCards.map((c) => c.user_game_card_id));
    return ownedCards.filter((c) => c.game_cards && !placedIds.has(c.id));
  }, [ownedCards, battleCards]);

  const startBattle = async (battlePhase: "capture" | "attack") => {
    setPlacing(true);
    try {
      const endsAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("poi_battles")
        .insert({ poi_id: poi.id, phase: battlePhase, ends_at: endsAt } as any)
        .select("id, phase, ends_at, resolved, winner_team")
        .single() as any;
      if (error) throw error;
      setBattle(data as BattleRow);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setPlacing(false);
    }
  };

  const placeCard = async (ownedCard: OwnedCard) => {
    if (!battle || !ownedCard.game_cards) return;
    setPlacing(true);
    try {
      const gc = ownedCard.game_cards;
      let statValue: number;
      let side: string;

      if (battle.phase === "capture") {
        statValue = gc.adaptability;
        side = "attack";
      } else if (isOwnTeam) {
        statValue = gc.resilience;
        side = "defend";
      } else {
        statValue = gc.power;
        side = "attack";
      }

      const { error } = await supabase
        .from("poi_battle_cards")
        .insert({
          battle_id: battle.id,
          user_id: userId,
          user_game_card_id: ownedCard.id,
          team_color: userTeam,
          side,
          stat_value: statValue,
        } as any);
      if (error) throw error;

      // Refresh battle cards
      const { data: cards } = await supabase
        .from("poi_battle_cards")
        .select("id, team_color, side, stat_value, user_id, user_game_card_id")
        .eq("battle_id", battle.id) as any;
      setBattleCards((cards as BattleCardRow[] | null) ?? []);
      toast.success(t.wdom_card_placed as string);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setPlacing(false);
    }
  };

  // Team summary
  const teamSummary = useMemo(() => {
    const teams: Record<string, { count: number; total: number; side: string }> = {};
    battleCards.forEach((c) => {
      if (!teams[c.team_color]) teams[c.team_color] = { count: 0, total: 0, side: c.side };
      teams[c.team_color].count++;
      teams[c.team_color].total += c.stat_value;
    });
    return teams;
  }, [battleCards]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card p-4 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{poi.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {poi.owner_team ? (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: TEAM_HEX[poi.owner_team] ?? "#888" }}
                >
                  {poi.owner_team.toUpperCase()}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{t.wdom_unowned as string}</span>
              )}
              {isInvulnerable && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> {t.wdom_invulnerable as string}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {poi.image_url && (
          <div className="rounded-xl overflow-hidden border border-border bg-muted">
            <img src={poi.image_url} alt="" className="w-full aspect-video object-cover" />
          </div>
        )}

        {!isNearby && (
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground text-center">
            📍 {t.wdom_too_far as string}
          </div>
        )}

        {/* No active battle */}
        {!battle && !isInvulnerable && isNearby && (
          <div className="space-y-3">
            {!isOwned ? (
              <Button className="w-full gap-2" onClick={() => startBattle("capture")} disabled={placing}>
                <Brain className="h-4 w-4" /> {t.wdom_start_capture as string}
              </Button>
            ) : !isOwnTeam ? (
              <Button className="w-full gap-2" variant="destructive" onClick={() => startBattle("attack")} disabled={placing}>
                <Sword className="h-4 w-4" /> {t.wdom_start_attack as string}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center">{t.wdom_your_territory as string}</p>
            )}
          </div>
        )}

        {/* Active battle */}
        {battle && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-border p-3">
              <div className="flex items-center gap-2">
                {battle.phase === "capture" ? (
                  <Brain className="h-4 w-4 text-cyan-400" />
                ) : (
                  <Sword className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm font-bold">
                  {battle.phase === "capture" ? (t.wdom_capture_phase as string) : (t.wdom_attack_phase as string)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm font-mono text-primary">
                <Clock className="h-3.5 w-3.5" /> {countdown}
              </div>
            </div>

            {/* Team scores */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">{t.wdom_forces as string}</h3>
              {Object.entries(teamSummary).map(([team, data]) => (
                <div key={team} className="flex items-center justify-between rounded-lg px-3 py-2 border border-border">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: TEAM_HEX[team] ?? "#888" }} />
                    <span className="text-xs font-bold uppercase">{team}</span>
                    <span className="text-xs text-muted-foreground">
                      {data.side === "defend" ? <Shield className="h-3 w-3 inline" /> : <Sword className="h-3 w-3 inline" />}
                    </span>
                  </div>
                  <span className="text-xs font-mono">
                    {data.count} {t.wdom_cards as string} · {data.total} pts
                  </span>
                </div>
              ))}
              {Object.keys(teamSummary).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">{t.wdom_no_cards_yet as string}</p>
              )}
            </div>

            {/* Place cards */}
            {canPlace && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  {t.wdom_place_card as string} ({teamCardsPlaced.length}/{maxPerTeam})
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {battle.phase === "capture"
                    ? (t.wdom_capture_stat as string)
                    : isOwnTeam
                      ? (t.wdom_defend_stat as string)
                      : (t.wdom_attack_stat as string)}
                </p>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                  {availableCards.slice(0, 20).map((card) => {
                    const gc = card.game_cards!;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => placeCard(card)}
                        disabled={placing}
                        className="relative hover:scale-105 transition-transform"
                      >
                        <GameCard
                          name={gc.name}
                          brand={gc.brand}
                          model={gc.model}
                          rarity={gc.rarity as CardRarity}
                          archetype={gc.archetype as CardArchetype}
                          speed={gc.speed}
                          resilience={gc.resilience}
                          adaptability={gc.adaptability}
                          power={gc.power}
                          hp={gc.hp}
                          condition={(card.condition ?? "good") as CardCondition}
                          className="w-[100px] h-[160px] text-[6px]"
                        />
                      </button>
                    );
                  })}
                  {availableCards.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 w-full text-center">
                      {t.wdom_no_available_cards as string}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
