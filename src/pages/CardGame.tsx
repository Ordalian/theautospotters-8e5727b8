import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { trackFeature } from "@/hooks/useTrackFeature";
import { pickWeightedRarity } from "@/data/gameCards";
import type { CardCondition, CardArchetype } from "@/data/gameCards";
import type { CardRarity } from "@/data/gameCards";
import { CONDITION_META, CONDITION_MODIFIERS } from "@/data/gameCards";
import { rollCondition } from "@/components/game/BoosterPack";
import { GameCard } from "@/components/game/GameCard";
import { BoosterOpeningFlow } from "@/components/game/BoosterOpeningFlow";
import type { DrawnCard } from "@/components/game/BoosterOpeningFlow";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Package, LayoutGrid, Zap, Shield, Brain, Sword, Users, Home, SlidersHorizontal, Check, Sparkles, ArrowDownWideNarrow, Layers } from "lucide-react";
import UserRoleBadge from "@/components/UserRoleBadge";
import type { Translations } from "@/i18n/translations/fr";
import { toast } from "sonner";

type Tab = "menu" | "collection" | "booster" | "friends";
type FilterArch = "all" | "speed" | "resilience" | "adaptability" | "power";
type FilterRarity = "all" | "common" | "uncommon" | "rare" | "mythic";
type SortStat = "none" | "speed" | "resilience" | "adaptability" | "power";

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
  const [tab, setTab] = useState<Tab>(() => (location.state as { tab?: Tab } | null)?.tab ?? "menu");
  const [masterCards, setMasterCards] = useState<MasterCard[]>([]);
  const [ownedCounts, setOwnedCounts] = useState<Map<string, number>>(new Map());
  const [ownedBestCondition, setOwnedBestCondition] = useState<Map<string, CardCondition>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterArch, setFilterArch] = useState<FilterArch>("all");
  const [filterRarity, setFilterRarity] = useState<FilterRarity>("all");
  const [sortStat, setSortStat] = useState<SortStat>("none");
  const [dailyStoredCount, setDailyStoredCount] = useState(0);
  const [nextDailyAt, setNextDailyAt] = useState<Date | null>(null);
  const [purchasedBoosterCount, setPurchasedBoosterCount] = useState(0);
  const [openingWithPurchased, setOpeningWithPurchased] = useState(false);
  const [boosterCards, setBoosterCards] = useState<MasterCard[] | null>(null);
  const [showBoosterFlow, setShowBoosterFlow] = useState(false);
  const [opening, setOpening] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState("");
  // Friends tab state
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendCounts, setFriendCounts] = useState<Map<string, number>>(new Map());
  const [friendBestCondition, setFriendBestCondition] = useState<Map<string, CardCondition>>(new Map());
  const [friendLoading, setFriendLoading] = useState(false);

  const CONDITION_RANK: Record<CardCondition, number> = { damaged: 0, average: 1, good: 2, perfect: 3 };
  const bestCondition = useCallback((conditions: CardCondition[]): CardCondition => {
    if (conditions.length === 0) return "good";
    return conditions.reduce((a, b) => (CONDITION_RANK[a] >= CONDITION_RANK[b] ? a : b));
  }, []);

  // Load master cards + own collection + daily boosters (claim first) + purchased
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      await supabase.rpc("claim_daily_boosters");
      const [{ data: master }, { data: owned }, { data: cd }, { data: purchased }] = await Promise.all([
        supabase.from("game_cards").select("*").order("rarity").order("archetype").order("name"),
        supabase.from("user_game_cards").select("card_id, condition").eq("user_id", user.id),
        supabase.from("user_booster_cooldown").select("stored_count, next_available_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_purchased_boosters").select("pending_count").eq("user_id", user.id).maybeSingle(),
      ]);

      setMasterCards((master || []) as MasterCard[]);

      const counts = new Map<string, number>();
      const byCard = new Map<string, CardCondition[]>();
      (owned as { card_id: string; condition?: string | null }[] || []).forEach((o) => {
        counts.set(o.card_id, (counts.get(o.card_id) || 0) + 1);
        const cond = (o.condition ?? "good") as CardCondition;
        if (!byCard.has(o.card_id)) byCard.set(o.card_id, []);
        byCard.get(o.card_id)!.push(cond);
      });
      setOwnedCounts(counts);
      const best = new Map<string, CardCondition>();
      byCard.forEach((conds, cardId) => best.set(cardId, bestCondition(conds)));
      setOwnedBestCondition(best);

      const cdRow = cd as { stored_count?: number; next_available_at?: string | null } | null;
      setDailyStoredCount(cdRow?.stored_count ?? 0);
      setNextDailyAt(cdRow?.next_available_at ? new Date(cdRow.next_available_at) : null);
      setPurchasedBoosterCount((purchased as { pending_count?: number } | null)?.pending_count ?? 0);
      setLoading(false);
    })();
  }, [user, bestCondition]);

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
        .select("user_id, username, avatar_url, role, is_premium")
        .in("user_id", friendIds);

      setFriends((profiles || []).map((p: any) => ({
        user_id: p.user_id,
        username: p.username || (t.anonymous as string),
        avatar_url: p.avatar_url,
        role: p.role ?? null,
        is_premium: p.is_premium ?? false,
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
      .select("card_id")
      .eq("user_id", friend.user_id);

    const counts = new Map<string, number>();
    (data as any[] || []).forEach((o: any) => {
      counts.set(o.card_id, (counts.get(o.card_id) || 0) + 1);
    });
    setFriendCounts(counts);
    setFriendBestCondition(new Map<string, CardCondition>());
    setFriendLoading(false);
  }

  // Daily booster countdown (next available when stored < 3)
  useEffect(() => {
    if (!nextDailyAt || dailyStoredCount >= 3) { setDailyCountdown(""); return; }
    const tick = () => {
      const diff = nextDailyAt.getTime() - Date.now();
      if (diff <= 0) { setDailyCountdown(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDailyCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [nextDailyAt, dailyStoredCount]);

  const filtered = useMemo(() => {
    const result = masterCards.filter((c) => {
      if (filterArch !== "all" && c.archetype !== filterArch) return false;
      if (filterRarity !== "all" && c.rarity !== filterRarity) return false;
      return true;
    });
    if (sortStat !== "none") {
      result.sort((a, b) => (b[sortStat] ?? 0) - (a[sortStat] ?? 0));
    }
    return result;
  }, [masterCards, filterArch, filterRarity, sortStat]);

  const ownedTotal = useMemo(() => {
    let total = 0;
    ownedCounts.forEach((v) => total += v);
    return total;
  }, [ownedCounts]);

  const dailyAvailable = useMemo(() => {
    const now = Date.now();
    const currentReady = nextDailyAt ? now >= nextDailyAt.getTime() : false;
    return Math.min(4, dailyStoredCount + (currentReady ? 1 : 0));
  }, [dailyStoredCount, nextDailyAt]);

  // Stats for menu tiles (same as HomeMenu)
  const menuStats = useMemo(() => {
    const now = Date.now();
    const remainingMs = nextDailyAt && dailyStoredCount < 3 ? Math.max(0, nextDailyAt.getTime() - now) : 0;
    const remainingH = Math.floor(remainingMs / 3600000);
    const remainingM = Math.floor((remainingMs % 3600000) / 60000);
    const cardIds = [...ownedCounts.keys()];
    const masterMap = new Map(masterCards.map((c) => [c.id, c.rarity]));
    const mythicCount = cardIds.filter((id) => masterMap.get(id) === "mythic").length;
    let perfectCount = 0;
    ownedBestCondition.forEach((cond) => { if (cond === "perfect") perfectCount++; });
    return {
      packAvailable: dailyAvailable > 0,
      dailyAvailable,
      dailyStoredCount,
      remainingH,
      remainingM,
      totalCards: ownedTotal,
      mythicCount,
      perfectCount,
      friendsCount: friends.length,
    };
  }, [dailyAvailable, dailyStoredCount, nextDailyAt, ownedCounts, ownedTotal, masterCards, ownedBestCondition, friends.length]);

  function startBoosterFlow(usePurchased: boolean) {
    if (!user || opening) return;
    if (usePurchased && purchasedBoosterCount <= 0) return;
    setOpeningWithPurchased(usePurchased);
    setOpening(true);
    setShowBoosterFlow(true);
  }

  const handleBoosterOpenPack = useCallback(async (packId: string): Promise<DrawnCard[]> => {
    const archetype = packId as CardArchetype;
    const picked: DrawnCard[] = [];
    for (let i = 0; i < 5; i++) {
      const rarity = pickWeightedRarity() as CardRarity;
      let pool = masterCards.filter((m) => m.rarity === rarity);
      if (rarity === "rare" || rarity === "mythic") {
        const typed = pool.filter((m) => m.archetype === archetype);
        if (typed.length > 0) pool = typed;
      }
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
        const isPurchased = openingWithPurchased;
        if (isPurchased) {
          const { data: consumed } = await supabase.rpc("consume_purchased_booster");
          if (!consumed) {
            toast.error("No purchased booster available");
            setShowBoosterFlow(false);
            setOpening(false);
            return;
          }
        }
        const inserts = drawnCards.map((c) => ({
          user_id: user.id,
          card_id: c.id,
          condition: c.condition ?? "good",
        }));
        const { error } = await supabase.from("user_game_cards").insert(inserts);
        if (error) throw error;
        trackFeature("booster_opened");
        if (!isPurchased) {
          const { data: consumed } = await supabase.rpc("consume_daily_booster");
          if (consumed && (consumed as { ok?: boolean }).ok !== false) {
            const { data: cd } = await supabase.from("user_booster_cooldown").select("stored_count, next_available_at").eq("user_id", user.id).maybeSingle();
            const row = cd as { stored_count?: number; next_available_at?: string | null } | null;
            setDailyStoredCount(row?.stored_count ?? 0);
            setNextDailyAt(row?.next_available_at ? new Date(row.next_available_at) : null);
          }
        } else {
          setPurchasedBoosterCount((c) => Math.max(0, c - 1));
        }
        const { data: styleDrop } = await supabase.rpc("process_booster_style_drop");
        const drop = styleDrop as { granted_style_id?: string | null; refund_coins?: number } | null;
        if (drop?.granted_style_id) toast.success(t.game_style_unlocked as string);
        else if (drop?.refund_coins && drop.refund_coins > 0) toast.success((t.game_style_refund as (n: number) => string)?.(drop.refund_coins) ?? `${drop.refund_coins} coins refunded`);
        setTab("collection");
        handleBoosterDone();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Error saving cards");
      } finally {
        setShowBoosterFlow(false);
        setOpening(false);
      }
    },
    [user, handleBoosterDone, openingWithPurchased]
  );

  function handleBoosterDone() {
    setBoosterCards(null);
    setTab("collection");
    if (!user) return;
    (async () => {
      const { data: owned } = await supabase.from("user_game_cards").select("card_id").eq("user_id", user.id);
      const counts = new Map<string, number>();
      (owned as any[] || []).forEach((o: any) => {
        counts.set(o.card_id, (counts.get(o.card_id) || 0) + 1);
      });
      setOwnedCounts(counts);
      setOwnedBestCondition(new Map<string, CardCondition>());
    })();
  }

  const archOptions: { key: FilterArch; icon: typeof Zap; label: string }[] = [
    { key: "all", icon: LayoutGrid, label: t.game_all as string },
    { key: "speed", icon: Zap, label: t.game_speed as string },
    { key: "resilience", icon: Shield, label: t.game_resilience as string },
    { key: "adaptability", icon: Brain, label: t.game_adaptability as string },
    { key: "power", icon: Sword, label: t.game_power as string },
  ];

  const rarityOptions: { key: FilterRarity; label: string }[] = [
    { key: "all", label: t.game_all as string },
    { key: "common", label: t.game_common as string },
    { key: "uncommon", label: t.game_uncommon as string },
    { key: "rare", label: t.game_rare as string },
    { key: "mythic", label: t.game_mythic as string },
  ];

  const sortStatOptions: { key: SortStat; icon: typeof Zap; label: string }[] = [
    { key: "none", icon: LayoutGrid, label: t.game_all as string },
    { key: "speed", icon: Zap, label: t.game_speed as string },
    { key: "power", icon: Sword, label: t.game_power as string },
    { key: "adaptability", icon: Brain, label: t.game_adaptability as string },
    { key: "resilience", icon: Shield, label: t.game_resilience as string },
  ];

  // Dropdown state for the 3 filter buttons
  const [openDropdown, setOpenDropdown] = useState<"arch" | "rarity" | "sort" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [openDropdown]);

  function renderCatalog(counts: Map<string, number>, bestConditionMap?: Map<string, CardCondition>) {
    const activeArchLabel = archOptions.find((o) => o.key === filterArch);
    const activeRarityLabel = rarityOptions.find((o) => o.key === filterRarity);
    const activeSortLabel = sortStatOptions.find((o) => o.key === sortStat);

    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4" ref={dropdownRef}>
          {/* Archetype filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className={`shrink-0 ${filterArch !== "all" ? "border-primary/50 text-primary" : ""}`}
              onClick={() => setOpenDropdown(openDropdown === "arch" ? null : "arch")}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
            {openDropdown === "arch" && (
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[170px] rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                {archOptions.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setFilterArch(key); setOpenDropdown(null); }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>
                    {filterArch === key && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rarity filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className={`shrink-0 ${filterRarity !== "all" ? "border-primary/50 text-primary" : ""}`}
              onClick={() => setOpenDropdown(openDropdown === "rarity" ? null : "rarity")}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
            {openDropdown === "rarity" && (
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                {rarityOptions.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setFilterRarity(key); setOpenDropdown(null); }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {label}
                    {filterRarity === key && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort by stat */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className={`shrink-0 ${sortStat !== "none" ? "border-primary/50 text-primary" : ""}`}
              onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
            >
              <ArrowDownWideNarrow className="h-5 w-5" />
            </Button>
            {openDropdown === "sort" && (
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[170px] rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                {sortStatOptions.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSortStat(key); setOpenDropdown(null); }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{key === "none" ? (t.game_no_sort as string || "Aucun tri") : label}</span>
                    {sortStat === key && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active filters summary */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {filterArch !== "all" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary whitespace-nowrap">
                {activeArchLabel?.label}
              </span>
            )}
            {filterRarity !== "all" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary whitespace-nowrap">
                {activeRarityLabel?.label}
              </span>
            )}
            {sortStat !== "none" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary whitespace-nowrap">
                ↓ {activeSortLabel?.label}
              </span>
            )}
          </div>
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
                onClick={count > 0 ? () => navigate(`/card-game/card/${card.id}`) : undefined}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const tx = t as Translations;
  const menuSubtitleBoosters =
    menuStats.packAvailable
      ? (typeof tx.menu_pack_available === "function" ? tx.menu_pack_available(menuStats.dailyAvailable) : `${menuStats.dailyAvailable} pack(s) disponible(s)`)
      : (typeof tx.menu_packs_next === "function" ? tx.menu_packs_next(menuStats.remainingH, menuStats.remainingM) : "");
  const menuSubtitleCollection =
    typeof tx.menu_cards_total === "function" && typeof tx.menu_mythic_perfect === "function"
      ? `${tx.menu_cards_total(menuStats.totalCards)}\n${tx.menu_mythic_perfect(menuStats.mythicCount, menuStats.perfectCount)}`
      : "—";
  const menuSubtitleFriends =
    typeof tx.menu_friends_count === "function"
      ? tx.menu_friends_count(menuStats.friendsCount)
      : "—";

  const headerTitle =
    selectedFriend
      ? `${t.game_friend_collection as string} ${selectedFriend.username}`
      : tab === "menu"
        ? (t.game_title as string)
        : tab === "collection"
          ? (t.game_collection as string)
          : tab === "booster"
            ? (t.game_booster as string)
            : (t.game_friends as string);

  const onBack = () => {
    if (selectedFriend) setSelectedFriend(null);
    else if (tab !== "menu") setTab("menu");
    else navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={onBack} className="shrink-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-lg font-bold text-foreground text-center truncate">
          {headerTitle}
        </h1>
        <Link
          to="/home"
          className="shrink-0 flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
        >
          <Home className="h-4 w-4" />
          <span>{t.dash_home as string}</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tab === "menu" ? (
        <div className="px-4 py-6 pb-32">
          {/* Boosters — full width */}
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setTab("booster")}
              className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] shadow-lg shadow-black/20 w-full"
            >
              <div className="flex w-full items-center gap-4 rounded-xl bg-card/90 p-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                  <Package className="h-10 w-10 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm leading-tight">{tx.menu_boosters as string}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 whitespace-pre-line">{menuSubtitleBoosters}</p>
                </div>
                {menuStats.packAvailable && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                    {tx.menu_badge_new as string}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* My Cards + Friends Cards — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTab("collection")}
              className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20 w-full"
            >
              <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
                <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5 rounded-lg relative">
                  <LayoutGrid className="h-11 w-11 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                  {menuStats.mythicCount > 0 && typeof tx.menu_badge_mythic === "function" && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      {tx.menu_badge_mythic(menuStats.mythicCount)}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="font-bold text-sm leading-tight">{tx.menu_my_cards as string}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-line">{menuSubtitleCollection}</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab("friends")}
              className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20 w-full"
            >
              <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
                <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg">
                  <Users className="h-11 w-11 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </div>
                <div className="mt-2">
                  <h3 className="font-bold text-sm leading-tight">{tx.menu_friends_cards as string}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{menuSubtitleFriends}</p>
                </div>
              </div>
            </button>
          </div>

          {/* Deck builder tile */}
          <button
            type="button"
            onClick={() => navigate("/card-game/deck-builder")}
            className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] shadow-lg shadow-black/20 w-full mt-3"
          >
            <div className="flex w-full items-center gap-4 rounded-xl bg-card/90 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-violet-500/10">
                <Layers className="h-7 w-7 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm leading-tight">{tx.menu_deck_builder as string}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{tx.menu_deck_builder_sub as string}</p>
              </div>
            </div>
          </button>

          {/* World Domination tile */}
          <button
            type="button"
            onClick={() => navigate("/card-game/world-domination")}
            className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] shadow-lg shadow-black/20 w-full mt-3"
          >
            <div className="flex w-full items-center gap-4 rounded-xl bg-card/90 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/10">
                <span className="text-2xl">🌍</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm leading-tight">{tx.menu_world_domination as string}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{tx.menu_world_domination_sub as string}</p>
              </div>
            </div>
          </button>

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
                  onClick={() => loadFriendCollection(f)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="font-medium text-foreground flex items-center gap-1">{f.username} <UserRoleBadge role={(f as any).role} isPremium={(f as any).is_premium} /></span>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground ml-auto rotate-180" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : showBoosterFlow ? (
        <BoosterOpeningFlow
          packs={[
            { id: "speed", name: (t.game_speed as string) || "Speed", count: openingWithPurchased ? purchasedBoosterCount : 1 },
            { id: "resilience", name: (t.game_resilience as string) || "Resilience", count: openingWithPurchased ? purchasedBoosterCount : 1 },
            { id: "adaptability", name: (t.game_adaptability as string) || "Adaptability", count: openingWithPurchased ? purchasedBoosterCount : 1 },
            { id: "power", name: (t.game_power as string) || "Power", count: openingWithPurchased ? purchasedBoosterCount : 1 },
          ]}
          onOpenPack={handleBoosterOpenPack}
          onComplete={handleBoosterComplete}
        />
      ) : (
        <div className="flex flex-col py-8 px-4 gap-8 max-w-md mx-auto">
          <p className="text-center text-muted-foreground text-sm">
            {t.game_booster_desc as string}
          </p>

          {/* Boosters quotidiens */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <span className="text-lg">📅</span>
              {typeof tx.game_daily_boosters === "string" ? tx.game_daily_boosters : "Boosters quotidiens"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dailyAvailable > 0
                ? (typeof tx.game_daily_boosters_available === "function" ? (tx.game_daily_boosters_available as (n: number) => string)(dailyAvailable) : `${dailyAvailable} à ouvrir`)
                : (typeof tx.game_daily_boosters_stored === "function" ? (tx.game_daily_boosters_stored as (n: number) => string)(dailyStoredCount) : `${dailyStoredCount}/3 stockés`)}
            </p>
            {dailyStoredCount < 3 && nextDailyAt && nextDailyAt.getTime() > Date.now() && (
              <p className="text-xs text-muted-foreground">
                {t.game_next_booster as string} <span className="font-mono font-semibold text-primary">{dailyCountdown}</span>
              </p>
            )}
            <Button
              onClick={() => startBoosterFlow(false)}
              disabled={opening || dailyAvailable <= 0}
              size="lg"
              className="w-full gap-2"
            >
              <Package className="h-5 w-5" />
              {opening ? (t.loading as string) : (t.game_open_free_booster as string)}
            </Button>
          </div>

          {/* Boosters premium */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <span className="text-lg">⭐</span>
              {typeof tx.game_premium_boosters === "string" ? tx.game_premium_boosters : "Boosters premium"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {typeof tx.game_premium_boosters_count === "function"
                ? (tx.game_premium_boosters_count as (n: number) => string)(purchasedBoosterCount)
                : `${purchasedBoosterCount} à ouvrir`}
            </p>
            <Button
              onClick={() => startBoosterFlow(true)}
              disabled={opening || purchasedBoosterCount <= 0}
              variant="secondary"
              size="lg"
              className="w-full gap-2"
            >
              <Package className="h-5 w-5" />
              {opening ? (t.loading as string) : (typeof t.game_open_purchased_booster === "function" ? (t.game_open_purchased_booster as (n: number) => string)(purchasedBoosterCount) : `${t.game_open_booster} (${purchasedBoosterCount})`)}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
