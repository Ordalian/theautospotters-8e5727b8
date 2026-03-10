import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuTile } from "@/components/MenuTile";
import type { Translations } from "@/i18n/translations/fr";

export function HomeMenu() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["home-menu", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [
        { data: cooldown },
        { data: owned },
        { data: masterCards },
        { data: friendships },
      ] = await Promise.all([
        supabase.from("user_booster_cooldown").select("last_opened_at").eq("user_id", user!.id).maybeSingle(),
        supabase.from("user_game_cards").select("card_id").eq("user_id", user!.id),
        supabase.from("game_cards").select("id, rarity").order("rarity").order("archetype").order("name"),
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`),
      ]);

      const COOLDOWN_MS = 12 * 60 * 60 * 1000;
      const lastOpened = cooldown?.last_opened_at ? new Date(cooldown.last_opened_at).getTime() : 0;
      const cooldownEnd = lastOpened + COOLDOWN_MS;
      const now = Date.now();
      const packAvailable = now >= cooldownEnd;
      const remainingMs = Math.max(0, cooldownEnd - now);
      const remainingH = Math.floor(remainingMs / 3600000);
      const remainingM = Math.floor((remainingMs % 3600000) / 60000);

      const ownedList = owned || [];
      const totalCards = ownedList.length;
      const perfectCount = 0;
      const cardIds = [...new Set(ownedList.map((o) => o.card_id))];
      const masterMap = new Map((masterCards || []).map((c: { id: string; rarity: string }) => [c.id, c.rarity]));
      const mythicCount = cardIds.filter((id) => masterMap.get(id) === "mythic").length;

      const friendIds = (friendships || []).map((f: { requester_id: string; addressee_id: string }) =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id
      );
      const friendsCount = friendIds.length;

      return {
        packAvailable,
        remainingH,
        remainingM,
        totalCards,
        mythicCount,
        perfectCount,
        friendsCount,
        newCardsFromFriends: 0,
      };
    },
  });

  const tx = t as Translations;
  const menuPackAvailable = typeof tx.menu_pack_available === "function" ? tx.menu_pack_available(1) : "1 pack disponible";
  const menuPacksNext =
    data && !data.packAvailable && typeof tx.menu_packs_next === "function"
      ? tx.menu_packs_next(data.remainingH, data.remainingM)
      : "";
  const subtitleBoosters = data ? (data.packAvailable ? menuPackAvailable : menuPacksNext) : "—";
  const subtitleMyCards =
    data && typeof tx.menu_cards_total === "function" && typeof tx.menu_mythic_perfect === "function"
      ? `${tx.menu_cards_total(data.totalCards)}\n${tx.menu_mythic_perfect(data.mythicCount, data.perfectCount)}`
      : "—";
  const subtitleFriends =
    data && typeof tx.menu_friends_count === "function"
      ? data.newCardsFromFriends > 0
        ? `${tx.menu_friends_count(data.friendsCount)}\n${typeof (tx as Record<string, (n: number) => string>).menu_new_cards_since === "function" ? (tx as Record<string, (n: number) => string>).menu_new_cards_since(data.newCardsFromFriends) : ""}`
        : tx.menu_friends_count(data.friendsCount)
      : "—";

  const badgeMythic =
    data && data.mythicCount > 0 && typeof tx.menu_badge_mythic === "function"
      ? tx.menu_badge_mythic(data.mythicCount)
      : undefined;
  const badgeNewCards =
    data && data.newCardsFromFriends > 0 && typeof (tx as Record<string, (n: number) => string>).menu_badge_new_cards === "function"
      ? (tx as Record<string, (n: number) => string>).menu_badge_new_cards(data.newCardsFromFriends)
      : undefined;

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/50 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MenuTile
          icon="📦"
          title={tx.menu_boosters as string}
          subtitle={subtitleBoosters}
          badge={data.packAvailable ? (tx.menu_badge_new as string) : undefined}
          badgeVariant={data.packAvailable ? "red" : undefined}
          onClick={() => navigate("/card-game", { state: { tab: "booster" } })}
        />
        <MenuTile
          icon="🏎️"
          title={tx.menu_my_cards as string}
          subtitle={subtitleMyCards}
          badge={badgeMythic}
          badgeVariant="gold"
          onClick={() => navigate("/card-game", { state: { tab: "collection" } })}
        />
        <MenuTile
          icon="👥"
          title={tx.menu_friends_cards as string}
          subtitle={subtitleFriends}
          badge={badgeNewCards}
          badgeVariant={badgeNewCards ? "blue" : undefined}
          onClick={() => navigate("/card-game/friends")}
        />
      </div>
    </div>
  );
}
