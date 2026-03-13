import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, LayoutGrid, Users } from "lucide-react";
import type { Translations } from "@/i18n/translations/fr";

export function HomeMenu() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["home-menu", user?.id],
    enabled: !!user,
    queryFn: async () => {
      await supabase.rpc("claim_daily_boosters");
      const [
        { data: cooldown },
        { data: owned },
        { data: masterCards },
        { data: friendships },
      ] = await Promise.all([
        supabase.from("user_booster_cooldown").select("stored_count, next_available_at").eq("user_id", user!.id).maybeSingle(),
        supabase.from("user_game_cards").select("card_id").eq("user_id", user!.id),
        supabase.from("game_cards").select("id, rarity").order("rarity").order("archetype").order("name"),
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`),
      ]);

      const cd = cooldown as { stored_count?: number; next_available_at?: string | null } | null;
      const storedCount = cd?.stored_count ?? 0;
      const nextAt = cd?.next_available_at ? new Date(cd.next_available_at) : null;
      const now = Date.now();
      const currentReady = nextAt ? now >= nextAt.getTime() : false;
      const dailyAvailable = Math.min(4, storedCount + (currentReady ? 1 : 0));
      const packAvailable = dailyAvailable > 0;
      const remainingMs = nextAt && storedCount < 3 ? Math.max(0, nextAt.getTime() - now) : 0;
      const remainingH = Math.floor(remainingMs / 3600000);
      const remainingM = Math.floor((remainingMs % 3600000) / 60000);

      const ownedList = owned || [];
      const totalCards = ownedList.length;
      const cardIds = [...new Set(ownedList.map((o) => o.card_id))];
      const masterMap = new Map((masterCards || []).map((c: { id: string; rarity: string }) => [c.id, c.rarity]));
      const mythicCount = cardIds.filter((id) => masterMap.get(id) === "mythic").length;
      const perfectCount = 0;

      const friendIds = (friendships || []).map((f: { requester_id: string; addressee_id: string }) =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id
      );

      return {
        packAvailable,
        dailyAvailable,
        remainingH,
        remainingM,
        totalCards,
        mythicCount,
        perfectCount,
        friendsCount: friendIds.length,
      };
    },
  });

  const tx = t as Translations;

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/50 border-t-transparent" />
      </div>
    );
  }

  const menuPackAvailable = typeof tx.menu_pack_available === "function" ? tx.menu_pack_available(data.dailyAvailable) : `${data.dailyAvailable} pack(s)`;
  const menuPacksNext =
    !data.packAvailable && typeof tx.menu_packs_next === "function"
      ? tx.menu_packs_next(data.remainingH, data.remainingM)
      : "";
  const subtitleBoosters = data.packAvailable ? menuPackAvailable : menuPacksNext;
  const subtitleMyCards =
    typeof tx.menu_cards_total === "function" && typeof tx.menu_mythic_perfect === "function"
      ? `${tx.menu_cards_total(data.totalCards)}\n${tx.menu_mythic_perfect(data.mythicCount, data.perfectCount)}`
      : "—";
  const subtitleFriends =
    typeof tx.menu_friends_count === "function"
      ? tx.menu_friends_count(data.friendsCount)
      : "—";

  const badgeMythic =
    data.mythicCount > 0 && typeof tx.menu_badge_mythic === "function"
      ? tx.menu_badge_mythic(data.mythicCount)
      : undefined;

  return (
    <div className="px-4 py-6 pb-24">
      {/* Boosters — full width */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => navigate("/card-game", { state: { tab: "booster" } })}
          className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] shadow-lg shadow-black/20 w-full"
        >
          <div className="flex w-full items-center gap-4 rounded-xl bg-card/90 p-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5">
              <Package className="h-10 w-10 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm leading-tight">{tx.menu_boosters as string}</h3>
              <p className="text-[10px] text-muted-foreground mt-1 whitespace-pre-line">{subtitleBoosters}</p>
            </div>
            {data.packAvailable && (
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
          onClick={() => navigate("/card-game", { state: { tab: "collection" } })}
          className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20 w-full"
        >
          <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
            <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5 rounded-lg relative">
              <LayoutGrid className="h-11 w-11 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              {badgeMythic && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {badgeMythic}
                </span>
              )}
            </div>
            <div className="mt-2">
              <h3 className="font-bold text-sm leading-tight">{tx.menu_my_cards as string}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-line">{subtitleMyCards}</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/card-game/friends")}
          className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20 w-full"
        >
          <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
            <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg">
              <Users className="h-11 w-11 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
            </div>
            <div className="mt-2">
              <h3 className="font-bold text-sm leading-tight">{tx.menu_friends_cards as string}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{subtitleFriends}</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
