import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ALL_GAME_CARDS, pickWeightedRarity } from "@/data/gameCards";
import { GameCard } from "@/components/game/GameCard";
import { BoosterPack } from "@/components/game/BoosterPack";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, LayoutGrid, Zap, Shield, Brain, Sword } from "lucide-react";
import { toast } from "sonner";

type Tab = "collection" | "booster";
type FilterArch = "all" | "speed" | "resilience" | "adaptability" | "power";
type FilterRarity = "all" | "common" | "uncommon" | "rare" | "mythic";

interface DBCard {
  id: string;
  card_id: string;
  obtained_at: string;
}

interface FullCard {
  id: string;
  card_id: string;
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

// We need the master card list from DB for card_id mapping
let masterCardsCache: any[] | null = null;

async function ensureMasterCards() {
  if (masterCardsCache) return masterCardsCache;
  const { data } = await supabase.from("game_cards").select("*");
  if (data && data.length > 0) {
    masterCardsCache = data;
    return data;
  }
  // Seed if empty
  const inserts = ALL_GAME_CARDS.map((c) => ({
    name: c.name,
    brand: c.brand,
    model: c.model,
    archetype: c.archetype,
    rarity: c.rarity,
    speed: c.speed,
    resilience: c.resilience,
    adaptability: c.adaptability,
    power: c.power,
    hp: c.hp,
  }));
  // Insert in batches of 50
  for (let i = 0; i < inserts.length; i += 50) {
    await supabase.from("game_cards").insert(inserts.slice(i, i + 50));
  }
  const { data: seeded } = await supabase.from("game_cards").select("*");
  masterCardsCache = seeded || [];
  return masterCardsCache;
}

export default function CardGame() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("collection");
  const [collection, setCollection] = useState<FullCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterArch, setFilterArch] = useState<FilterArch>("all");
  const [filterRarity, setFilterRarity] = useState<FilterRarity>("all");
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [boosterCards, setBoosterCards] = useState<FullCard[] | null>(null);
  const [opening, setOpening] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Load collection & cooldown
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const master = await ensureMasterCards();
      const masterMap = new Map(master.map((m: any) => [m.id, m]));

      const { data: owned } = await supabase.from("user_game_cards").select("*").eq("user_id", user.id);
      const cards: FullCard[] = (owned || []).map((o: any) => {
        const m = masterMap.get(o.card_id);
        return m ? { id: o.id, card_id: o.card_id, ...m } : null;
      }).filter(Boolean) as FullCard[];
      setCollection(cards);

      const { data: cd } = await supabase.from("user_booster_cooldown").select("*").eq("user_id", user.id).maybeSingle();
      if (cd) {
        const end = new Date(new Date(cd.last_opened_at).getTime() + 12 * 60 * 60 * 1000);
        if (end > new Date()) setCooldownEnd(end);
      }
      setLoading(false);
    })();
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (!cooldownEnd) { setCountdown(""); return; }
    const tick = () => {
      const diff = cooldownEnd.getTime() - Date.now();
      if (diff <= 0) { setCooldownEnd(null); setCountdown(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [cooldownEnd]);

  const filtered = useMemo(() => {
    return collection.filter((c) => {
      if (filterArch !== "all" && c.archetype !== filterArch) return false;
      if (filterRarity !== "all" && c.rarity !== filterRarity) return false;
      return true;
    });
  }, [collection, filterArch, filterRarity]);

  async function openBooster() {
    if (!user || opening) return;
    setOpening(true);
    try {
      const master = await ensureMasterCards();

      // Pick 5 cards
      const picked: any[] = [];
      for (let i = 0; i < 5; i++) {
        const rarity = pickWeightedRarity();
        const pool = master.filter((m: any) => m.rarity === rarity);
        const card = pool[Math.floor(Math.random() * pool.length)];
        picked.push(card);
      }

      // Insert into user_game_cards
      const inserts = picked.map((c: any) => ({ user_id: user.id, card_id: c.id }));
      const { error } = await supabase.from("user_game_cards").insert(inserts);
      if (error) throw error;

      // Update cooldown
      const { data: existing } = await supabase.from("user_booster_cooldown").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) {
        await supabase.from("user_booster_cooldown").update({ last_opened_at: new Date().toISOString() }).eq("user_id", user.id);
      } else {
        await supabase.from("user_booster_cooldown").insert({ user_id: user.id, last_opened_at: new Date().toISOString() });
      }

      const end = new Date(Date.now() + 12 * 60 * 60 * 1000);
      setCooldownEnd(end);

      // Get inserted IDs
      const { data: newCards } = await supabase.from("user_game_cards").select("*").eq("user_id", user.id).order("obtained_at", { ascending: false }).limit(5);
      const masterMap = new Map(master.map((m: any) => [m.id, m]));
      const fullCards = (newCards || []).map((o: any) => {
        const m = masterMap.get(o.card_id);
        return m ? { id: o.id, card_id: o.card_id, ...m } : null;
      }).filter(Boolean) as FullCard[];

      setBoosterCards(fullCards);
      setTab("booster");
    } catch (e: any) {
      toast.error(e.message || "Error opening booster");
    } finally {
      setOpening(false);
    }
  }

  function handleBoosterDone() {
    setBoosterCards(null);
    setTab("collection");
    // Reload collection
    if (!user) return;
    (async () => {
      const master = await ensureMasterCards();
      const masterMap = new Map(master.map((m: any) => [m.id, m]));
      const { data: owned } = await supabase.from("user_game_cards").select("*").eq("user_id", user.id);
      const cards: FullCard[] = (owned || []).map((o: any) => {
        const m = masterMap.get(o.card_id);
        return m ? { id: o.id, card_id: o.card_id, ...m } : null;
      }).filter(Boolean) as FullCard[];
      setCollection(cards);
    })();
  }

  const archFilters: { key: FilterArch; icon: typeof Zap; label: string }[] = [
    { key: "all", icon: LayoutGrid, label: t.game_all as string },
    { key: "speed", icon: Zap, label: t.game_speed as string },
    { key: "resilience", icon: Shield, label: t.game_resilience as string },
    { key: "adaptability", icon: Brain, label: t.game_adaptability as string },
    { key: "power", icon: Sword, label: t.game_power as string },
  ];

  const rarityFilters: FilterRarity[] = ["all", "common", "uncommon", "rare", "mythic"];
  const rarityLabels: Record<FilterRarity, string> = {
    all: t.game_all as string,
    common: t.game_common as string,
    uncommon: t.game_uncommon as string,
    rare: t.game_rare as string,
    mythic: t.game_mythic as string,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t.game_title as string}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setTab("collection"); setBoosterCards(null); }}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === "collection" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
        >
          <LayoutGrid className="h-4 w-4 inline mr-1.5" />
          {t.game_collection as string} ({collection.length})
        </button>
        <button
          onClick={() => setTab("booster")}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === "booster" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
        >
          <Package className="h-4 w-4 inline mr-1.5" />
          {t.game_booster as string}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tab === "collection" ? (
        <div className="px-4 py-4">
          {/* Archetype filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
            {archFilters.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setFilterArch(key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterArch === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Rarity filter */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
            {rarityFilters.map((r) => (
              <button
                key={r}
                onClick={() => setFilterRarity(r)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterRarity === r ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {rarityLabels[r]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">{t.game_no_cards as string}</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              {filtered.map((card) => (
                <GameCard key={card.id} {...card} />
              ))}
            </div>
          )}
        </div>
      ) : boosterCards ? (
        <BoosterPack cards={boosterCards} onDone={handleBoosterDone} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-6 px-4">
          <div className="text-6xl">📦</div>
          <p className="text-center text-muted-foreground text-sm max-w-xs">
            {t.game_booster_desc as string}
          </p>

          {cooldownEnd ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t.game_next_booster as string}</p>
              <p className="text-2xl font-bold font-mono text-primary">{countdown}</p>
            </div>
          ) : (
            <Button onClick={openBooster} disabled={opening} size="lg" className="gap-2">
              <Package className="h-5 w-5" />
              {opening ? (t.loading as string) : (t.game_open_booster as string)}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
