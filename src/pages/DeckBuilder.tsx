import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import type { CardRarity, CardCondition } from "@/data/gameCards";
import { CARD_POINTS, DECK_MAX_POINTS, DECK_MAX_CARDS } from "@/data/gameCards";
import { GameCard } from "@/components/game/GameCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Plus, Trash2, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface GameCardRow {
  id: string;
  name: string;
  brand: string;
  model: string;
  rarity: CardRarity;
  archetype: string;
  speed: number;
  resilience: number;
  adaptability: number;
  power: number;
  hp: number;
}

interface OwnedInstance {
  id: string;
  card_id: string;
  condition: string | null;
  game_cards: GameCardRow | null;
}

function getPoints(rarity: CardRarity): number {
  return CARD_POINTS[rarity] ?? 3;
}

export default function DeckBuilder() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [instances, setInstances] = useState<OwnedInstance[]>([]);
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const [instancesRes, deckRes] = await Promise.all([
      supabase
        .from("user_game_cards")
        .select("id, card_id, condition, game_cards(id, name, brand, model, rarity, archetype, speed, resilience, adaptability, power, hp)")
        .eq("user_id", user.id),
      supabase.from("user_deck").select("card_ids").eq("user_id", user.id).maybeSingle(),
    ]);
    const raw = (instancesRes.data ?? []) as (Omit<OwnedInstance, "game_cards"> & { game_cards: GameCardRow | null })[];
    setInstances(raw.map((r) => ({ ...r, game_cards: r.game_cards ?? null })));
    const ids = (deckRes.data as { card_ids?: string[] } | null)?.card_ids ?? [];
    setDeckIds(Array.isArray(ids) ? ids.filter(Boolean) : []);
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [user, fetchData]);

  const validInstances = instances.filter((i): i is OwnedInstance => i.game_cards != null);
  const instanceMap = new Map(validInstances.map((i) => [i.id, i]));
  const deckInstances = deckIds.map((id) => instanceMap.get(id)).filter(Boolean) as OwnedInstance[];
  const collectionInstances = validInstances.filter((i) => !deckIds.includes(i.id));

  const deckPoints = deckInstances.reduce(
    (sum, i) => sum + getPoints((i.game_cards?.rarity ?? "common") as CardRarity),
    0
  );
  const deckCount = deckIds.length;
  const canAddMore = deckCount < DECK_MAX_CARDS && deckPoints < DECK_MAX_POINTS;

  const addToDeck = (instanceId: string) => {
    const inst = instanceMap.get(instanceId);
    if (!inst?.game_cards) return;
    if (deckCount >= DECK_MAX_CARDS) {
      toast.error(t.deck_max_cards as string);
      return;
    }
    const pts = getPoints(inst.game_cards.rarity as CardRarity);
    if (deckPoints + pts > DECK_MAX_POINTS) {
      toast.error(t.deck_max_points as string);
      return;
    }
    setDeckIds((prev) => [...prev, instanceId]);
  };

  const removeFromDeck = (instanceId: string) => {
    setDeckIds((prev) => prev.filter((id) => id !== instanceId));
  };

  const saveDeck = async () => {
    if (!user) return;
    if (deckCount > DECK_MAX_CARDS || deckPoints > DECK_MAX_POINTS) {
      toast.error(t.deck_invalid as string);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_deck")
        .upsert(
          { user_id: user.id, card_ids: deckIds, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast.success(t.deck_saved as string);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => navigate("/auth")}>{t.auth_sign_in as string}</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/card-game")} className="shrink-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-lg font-bold text-center truncate">{t.deck_builder_title as string}</h1>
        <Link to="/home" className="shrink-0 text-muted-foreground hover:text-primary">
          <Home className="h-5 w-5" />
        </Link>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Deck summary + save */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="font-bold text-sm">{t.deck_my_deck as string}</h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {deckPoints}/{DECK_MAX_POINTS} pts · {deckCount}/{DECK_MAX_CARDS} {t.deck_cards as string}
            </span>
          </div>
          <Button
            className="w-full gap-2"
            disabled={saving}
            onClick={saveDeck}
          >
            <Save className="h-4 w-4" />
            {saving ? (t.loading as string) : (t.deck_save as string)}
          </Button>
        </section>

        {/* Current deck */}
        <section>
          <h3 className="text-sm font-bold mb-2">{t.deck_current as string}</h3>
          {deckInstances.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border border-dashed border-border">
              {t.deck_empty as string}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {deckInstances.map((inst) => {
                const card = inst.game_cards!;
                const condition = (inst.condition ?? "good") as CardCondition;
                return (
                  <div key={inst.id} className="relative group">
                    <GameCard
                      {...card}
                      condition={condition}
                      count={1}
                      onClick={() => navigate(`/card-game/card/${card.id}`)}
                      className="cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromDeck(inst.id)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      aria-label={t.delete as string}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-background/80 px-1 rounded">
                      {getPoints(card.rarity)} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Collection: add to deck */}
        <section>
          <h3 className="text-sm font-bold mb-2">{t.deck_collection as string}</h3>
          {collectionInstances.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border border-dashed border-border">
              {t.deck_no_cards as string}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {collectionInstances.map((inst) => {
                const card = inst.game_cards!;
                const condition = (inst.condition ?? "good") as CardCondition;
                const pts = getPoints(card.rarity as CardRarity);
                const wouldExceedPoints = deckPoints + pts > DECK_MAX_POINTS;
                const wouldExceedCount = deckCount >= DECK_MAX_CARDS;
                const canAdd = canAddMore && !wouldExceedPoints && !wouldExceedCount;
                return (
                  <div key={inst.id} className="relative group">
                    <GameCard
                      {...card}
                      condition={condition}
                      count={1}
                      onClick={canAdd ? () => addToDeck(inst.id) : undefined}
                      className={canAdd ? "cursor-pointer hover:ring-2 hover:ring-primary" : "opacity-75"}
                    />
                    {canAdd ? (
                      <button
                        type="button"
                        onClick={() => addToDeck(inst.id)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        aria-label={t.deck_add as string}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    ) : null}
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-background/80 px-1 rounded">
                      {pts} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
