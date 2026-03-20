import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getLevelProgress } from "@/lib/leveling";
import { Car, Users, Flame } from "lucide-react";
import { DailyStreak } from "./DailyStreak";

export function DashboardWidget() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data } = useQuery({
    queryKey: ["dash-widget", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [profileRes, mySpotsRes, friendshipsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("total_xp, pinned_car_id, avatar_url")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("cars")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .neq("vehicle_type", "hot_wheels")
          .gte("created_at", todayISO),
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`),
      ]);

      // Friend spots today
      let friendSpotsToday = 0;
      const friendships = friendshipsRes.data || [];
      if (friendships.length > 0) {
        const friendIds = friendships.map((f) =>
          f.requester_id === user!.id ? f.addressee_id : f.requester_id,
        );
        const { count } = await supabase
          .from("cars")
          .select("id", { count: "exact", head: true })
          .in("user_id", friendIds)
          .neq("vehicle_type", "hot_wheels")
          .gte("created_at", todayISO);
        friendSpotsToday = count ?? 0;
      }

      // Pinned car image
      let pinnedImage: string | null = null;
      const pinnedId = (profileRes.data as any)?.pinned_car_id;
      if (pinnedId) {
        const { data: car } = await supabase
          .from("cars")
          .select("image_url")
          .eq("id", pinnedId)
          .maybeSingle();
        pinnedImage = car?.image_url ?? null;
      }

      return {
        totalXp: (profileRes.data as any)?.total_xp ?? 0,
        pinnedImage,
        mySpotsToday: mySpotsRes.count ?? 0,
        friendSpotsToday,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const totalXp = data?.totalXp ?? 0;
  const lp = getLevelProgress(totalXp);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Top: pinned car or gradient */}
      <div className="relative h-24">
        {data?.pinnedImage ? (
          <img
            src={data.pinnedImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />

        {/* Level badge */}
        <div className="absolute bottom-2 left-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg">
            {lp.level}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t.level_label as string || "Level"}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${lp.progressFraction * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground tabular-nums">
                {Math.round(lp.progressFraction * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-3 py-2.5 flex items-center gap-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 flex-1">
          <Car className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs">
            <span className="font-bold tabular-nums">{data?.mySpotsToday ?? 0}</span>{" "}
            <span className="text-muted-foreground">{t.widget_today as string || "aujourd'hui"}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs">
            <span className="font-bold tabular-nums">{data?.friendSpotsToday ?? 0}</span>{" "}
            <span className="text-muted-foreground">{t.widget_friends as string || "amis"}</span>
          </span>
        </div>
        <DailyStreak compact />
      </div>
    </div>
  );
}
