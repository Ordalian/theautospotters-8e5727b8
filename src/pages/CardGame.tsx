import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { pickWeightedRarity } from "@/data/gameCards";
import type { CardCondition } from "@/data/gameCards";
import { rollCondition } from "@/components/game/BoosterPack";
import { GameCard } from "@/components/game/GameCard";
import { BoosterOpeningFlow } from "@/components/game/BoosterOpeningFlow";
import type { DrawnCard } from "@/components/game/BoosterOpeningFlow";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Package, LayoutGrid, Zap, Shield, Brain, Sword, Users, Home } from "lucide-react";
import { toast } from "sonner";

type Tab = "collection" | "booster" | "friends";
type FilterArch = "all" | "speed" | "resilience" | "adaptability" | "power";
type FilterRarity = "all" | "common" | "uncommon" | "rare" | "mythic";

interface MasterCard {
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
  condition?: "damaged" | "average" | "good" | "perfect";
}

interface FriendProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export default function CardGame() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>(() => (location.state as { tab?: Tab } | null)?.tab ?? "collection");
  const [masterCards, setMasterCards] = useState<MasterCard[]>([]);
  const [ownedCounts, setOwnedCounts] = useState<Map<string, number>>(new Map());
  const [ownedBestCondition, setOwnedBestCondition] = useState<Map<string, CardCondition>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterArch, setFilterArch] = useState<FilterArch>("all");
  const [filterRarity, setFilterRarity] = useState<FilterRarity>("all");
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [boosterCards, setBoosterCards] = useState<MasterCard[] | null>(null);
  const [showBoosterFlow, setShowBoosterFlow] = useState(false);
  const [opening, setOpening] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Friends tab state
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendCounts, setFriendCounts] = useState<Map<string, number>>(new Map());
  const [friendBestCondition, setFriendBestCondition] = useState<Map<string, CardCondition>>(new Map());
  const [friendLoading, setFriendLoading] = useState(false);

  const CONDITION_RANK: Record<CardCondition, number> = { damaged: 0, average: 1, good: 2, perfect: 3 };
  function bestCondition(conditions: CardCondition[]): CardCondition {
    if (conditions.length === 0) return "good";
    return conditions.reduce((a, b) => (CONDITION_RANK[a] >= CONDITION_RANK[b] ? a : b));
  }

  // Load master cards + own collection + cooldown
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: master }, { data: owned }, { data: cd }] = await Promise.all([
        supabase.from("game_cards").select("*").order("rarity").order("archetype").order("name"),
        supabase.from("user_game_cards").select("card_id, condition").eq("user_id", user.id),
        supabase.from("user_booster_cooldown").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      setMasterCards((master || []) as MasterCard[]);

      const counts = new Map<string, number>();
      const byCard = new Map<string, CardCondition[]>();
      (owned || []).forEach((o: { card_id: string; condition?: string | null }) => {
        counts.set(o.card_id, (counts.get(o.card_id) || 0) + 1);
        const cond = (o.condition ?? "good") as CardCondition;
        if (!byCard.has(o.card_id)) byCard.set(o.card_id, []);
        byCard.get(o.card_id)!.push(cond);
      });
      setOwnedCounts(counts);
      const best = new Map<string, CardCondition>();
      byCard.forEach((conds, cardId) => best.set(cardId, bestCondition(conds)));
      setOwnedBestCondition(best);

      if (cd) {
        const end = new Date(new Date(cd.last_opened_at).getTime() + 12 * 60 * 60 * 1000);
        if (end > new Date()) setCooldownEnd(end);
      }
      setLoading(false);
    })();
  }, [user]);

  // Load friends list
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) { setFriends([]); return; }

      const friendIds = friendships.map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url")
        .in("user_id", friendIds);

      setFriends((profiles || []).map((p: any) => ({
        user_id: p.user_id,
        username: p.username || (t.anonymous as string),
        avatar_url: p.avatar_url,
      })));
    })();
  }, [user]);

  // Open friend collection when navigating from AmisList with openFriendId
  useEffect(() => {
    const openId = (location.state as { openFriendId?: string } | null)?.openFriendId;
    if (!openId || friends.length === 0) return;
    const friend = friends.find((f) => f.user_id === openId);
    if (friend) {
      loadFriendCollection(friend);
      navigate("/card-game", { replace: true, state: { tab: "friends" } });
    }
  }, [friends, location.state]);

  // Load friend's collection
  async function loadFriendCollection(friend: FriendProfile) {
    setSelectedFriend(friend);
    setFriendLoading(true);
    const { data } = await supabase
      .from("user_game_cards")
      .select("card_id, condition")
      .eq("user_id", friend.user_id);

    const counts = new Map<string, number>();
    const byCard = new Map<string, CardCondition[]>();
    (data || []).forEach((o: { card_id: string; condition?: string | null }) => {
      counts.set(o.card_id, (counts.get(o.card_id) || 0) + 1);
      const cond = (o.condition ?? "good") as CardCondition;
      if (!byCard.has(o.card_id)) byCard.set(o.card_id, []);
      byCard.get(o.card_id)!.push(cond);
    });
    setFriendCounts(counts);
    const best = new Map<string, CardCondition>();
    byCard.forEach((conds, cardId) => best.set(cardId, bestCondition(conds)));
    setFriendBestCondition(best);
    setFriendLoading(false);
  }

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
    return masterCards.filter((c) => {
      if (filterArch !== "all" && c.archetype !== filterArch) return false;
      if (filterRarity !== "all" && c.rarity !== filterRarity) return false;
      return true;
    });
  }, [masterCards, filterArch, filterRarity]);

  const ownedTotal = useMemo(() => {
    let total = 0;
    ownedCounts.forEach((v) => total += v);
    return total;
  }, [ownedCounts]);

  function startBoosterFlow() {
    if (!user || opening) return;
    setOpening(true);
    setShowBoosterFlow(true);
  }

  const handleBoosterOpenPack = useCallback(async (): Promise<DrawnCard[]> => {
    const picked: DrawnCard[] = [];
    for (let i = 0; i < 5; i++) {
      const rarity = pickWeightedRarity();
      const pool = masterCards.filter((m) => m.rarity === rarity);
      const card = pool[Math.floor(Math.random() * pool.length)];
      if (!card) continue;
      picked.push({ ...card, condition: rollCondition() } as DrawnCard);
    }
    return picked;
  }, [masterCards]);

  const handleBoosterComplete = useCallback(
    async (drawnCards: DrawnCard[]) => {
      if (!user || drawnCards.length === 0) {
        setShowBoosterFlow(false);
        setOpening(false);
        return;
      }
      try {
        const inserts = drawnCards.map((c) => ({
          user_id: user.id,
          card_id: c.id,
          condition: c.condition ?? "good",
        }));
        const { error } = await supabase.from("user_game_cards").insert(inserts);
        if (error) throw error;
        const { data: existing } = await supabase.from("user_booster_cooldown").select("id").eq("user_id", user.id).maybeSingle();
        if (existing) {
          await supabase.from("user_booster_cooldown").update({ last_opened_at: new Date().toISOString() }).eq("user_id", user.id);
        } else {
          await supabase.from("user_booster_cooldown").insert({ user_id: user.id, last_opened_at: new Date().toISOString() });
        }
        setCooldownEnd(new Date(Date.now() + 12 * 60 * 60 * 1000));
        setTab("collection");
        handleBoosterDone();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error saving cards");
      } finally {
        setShowBoosterFlow(false);
        setOpening(false);
      }
    },
    [user, handleBoosterDone]
  );

  function handleBoosterDone() {
    setBoosterCards(null);
    setTab("collection");
    if (!user) return;
    (async () => {
      const { data: owned } = await supabase.from("user_game_cards").select("card_id, condition").eq("user_id", user.id);
      const counts = new Map<string, number>();
      const byCard = new Map<string, CardCondition[]>();
      (owned || []).forEach((o: { card_id: string; condition?: string | null }) => {
        counts.set(o.card_id, (counts.get(o.card_id) || 0) + 1);
        const cond = (o.condition ?? "good") as CardCondition;
        if (!byCard.has(o.card_id)) byCard.set(o.card_id, []);
        byCard.get(o.card_id)!.push(cond);
      });
      setOwnedCounts(counts);
      const best = new Map<string, CardCondition>();
      byCard.forEach((conds, cardId) => best.set(cardId, bestCondition(conds)));
      setOwnedBestCondition(best);
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

  // Catalog view (reused for own collection and friend's collection)
  function renderCatalog(counts: Map<string, number>, bestConditionMap?: Map<string, CardCondition>) {
    return (
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

        <div className="flex flex-wrap justify-center gap-3">
          {filtered.map((card) => {
            const count = counts.get(card.id) || 0;
            const condition = bestConditionMap?.get(card.id);
            return (
              <GameCard
                key={card.id}
                {...card}
                condition={condition}
                greyed={count === 0}
                count={count}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={() => selectedFriend ? setSelectedFriend(null) : navigate("/home")} className="shrink-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-lg font-bold text-foreground text-center truncate">
          {selectedFriend ? `${t.game_friend_collection as string} ${selectedFriend.username}` : (t.game_title as string)}
        </h1>
        <Link
          to="/home"
          className="shrink-0 flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
        >
          <Home className="h-4 w-4" />
          <span>{t.dash_home as string}</span>
        </Link>
      </div>

      {/* Tabs */}
      {!selectedFriend && (
        <div className="flex border-b border-border">
          <button
            onClick={() => { setTab("collection"); setBoosterCards(null); }}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === "collection" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4 inline mr-1.5" />
            {t.game_collection as string} ({ownedCounts.size}/{masterCards.length})
          </button>
          <button
            onClick={() => setTab("booster")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === "booster" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Package className="h-4 w-4 inline mr-1.5" />
            {t.game_booster as string}
          </button>
          <button
            onClick={() => setTab("friends")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${tab === "friends" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Users className="h-4 w-4 inline mr-1.5" />
            {t.game_friends as string}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : selectedFriend ? (
        friendLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : renderCatalog(friendCounts, friendBestCondition)
      ) : tab === "collection" ? (
        renderCatalog(ownedCounts, ownedBestCondition)
      ) : tab === "friends" ? (
        <div className="px-4 py-4">
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">{t.game_no_friends as string}</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <button
                  key={f.user_id}
                  onClick={() => { loadFriendCollection(f); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="font-medium text-foreground">{f.username}</span>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground ml-auto rotate-180" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : showBoosterFlow ? (
        <BoosterOpeningFlow
          packs={[{ id: "booster", name: (t.game_booster as string) || "BOOSTER", count: 1 }]}
          onOpenPack={handleBoosterOpenPack}
          onComplete={handleBoosterComplete}
        />
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
            <Button onClick={startBoosterFlow} disabled={opening} size="lg" className="gap-2">
              <Package className="h-5 w-5" />
              {opening ? (t.loading as string) : (t.game_open_booster as string)}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
