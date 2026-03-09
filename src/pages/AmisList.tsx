import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GameCard } from "@/components/game/GameCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import type { CardCondition } from "@/data/gameCards";

interface CardDef {
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
}

interface FriendWithCards {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  totalCards: number;
  lastCards: { card: CardDef; condition?: CardCondition }[];
}

export default function AmisList() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: friendsWithCards, isLoading } = useQuery({
    queryKey: ["amis-list", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FriendWithCards[]> => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);

      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map((f) =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id
      );

      const [{ data: profiles }, { data: allOwned }] = await Promise.all([
        supabase.from("profiles_public").select("user_id, username, avatar_url").in("user_id", friendIds),
        supabase
          .from("user_game_cards")
          .select("user_id, card_id, condition, obtained_at")
          .in("user_id", friendIds)
          .order("obtained_at", { ascending: false }),
      ]);

      const profileMap = new Map(
        (profiles || []).map((p: { user_id: string; username: string | null; avatar_url: string | null }) => [
          p.user_id,
          { username: p.username, avatar_url: p.avatar_url },
        ])
      );

      const byUser = new Map<string, { card_id: string; condition?: string | null; obtained_at: string }[]>();
      (allOwned || []).forEach((row: { user_id: string; card_id: string; condition?: string | null; obtained_at: string }) => {
        if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
        const arr = byUser.get(row.user_id)!;
        if (arr.length < 3) arr.push({ card_id: row.card_id, condition: row.condition, obtained_at: row.obtained_at });
      });

      const totalByUser = new Map<string, number>();
      (allOwned || []).forEach((row: { user_id: string }) => {
        totalByUser.set(row.user_id, (totalByUser.get(row.user_id) || 0) + 1);
      });

      const cardIds = new Set<string>();
      byUser.forEach((arr) => arr.forEach((r) => cardIds.add(r.card_id)));
      const { data: cards } = await supabase
        .from("game_cards")
        .select("*")
        .in("id", [...cardIds]);

      const cardMap = new Map<string, CardDef>((cards || []).map((c) => [c.id, c as CardDef]));

      return friendIds.map((uid) => {
        const profile = profileMap.get(uid);
        const lastRows = byUser.get(uid) || [];
        const lastCards = lastRows
          .map((r) => {
            const card = cardMap.get(r.card_id);
            if (!card) return null;
            return { card, condition: (r.condition ?? "good") as CardCondition };
          })
          .filter((x): x is { card: CardDef; condition: CardCondition } => x !== null);
        return {
          user_id: uid,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          totalCards: totalByUser.get(uid) || 0,
          lastCards,
        };
      });
    },
  });

  const tx = t as { amis_list_title?: string; amis_list_cards_count?: (n: number) => string; amis_list_last_cards?: string; game_no_friends?: string };
  const title = tx.amis_list_title ?? "Cartes d'amis";
  const lastCardsLabel = tx.amis_list_last_cards ?? "Dernières cartes";
  const cardsCountStr = (n: number) => (typeof tx.amis_list_cards_count === "function" ? tx.amis_list_cards_count(n) : `${n} cartes`);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/card-game")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground uppercase tracking-wider">{title}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/50 border-t-transparent" />
        </div>
      ) : !friendsWithCards || friendsWithCards.length === 0 ? (
        <p className="text-center text-muted-foreground py-10 px-4 text-sm">{tx.game_no_friends ?? "Ajoute des amis pour voir leurs collections !"}</p>
      ) : (
        <div className="px-4 py-4 space-y-6">
          {friendsWithCards.map((friend) => (
            <section
              key={friend.user_id}
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-zinc-900 to-zinc-800 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">
                    {friend.username ?? (t as { anonymous?: string }).anonymous ?? "Anonyme"}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {cardsCountStr(friend.totalCards)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/40 text-amber-400/90 shrink-0"
                  onClick={() => navigate("/card-game", { state: { tab: "friends", openFriendId: friend.user_id } })}
                >
                  {(t as { amis_list_view?: string }).amis_list_view ?? "Voir la collection"}
                </Button>
              </div>
              {friend.lastCards.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{lastCardsLabel}</p>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {friend.lastCards.map(({ card, condition }) => (
                      <div key={card.id} className="scale-75 origin-left">
                        <GameCard
                          {...card}
                          condition={condition}
                          className="pointer-events-none"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
