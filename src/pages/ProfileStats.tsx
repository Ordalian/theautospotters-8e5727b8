import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBlacklist } from "@/hooks/useBlacklist";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLevelProgress } from "@/lib/leveling";
import { ACHIEVEMENTS, ACHIEVEMENT_SHAPES, getAchievementLevel, getAchievementValue, type AchievementId } from "@/lib/achievements";
import { Emblem } from "@/components/Emblem";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Car } from "lucide-react";
import { SignedMediaImg } from "@/components/SignedMediaImg";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import UserRoleBadge from "@/components/UserRoleBadge";

const VEHICLE_TYPES_ORDER = ["car", "truck", "motorcycle", "boat", "plane", "train"] as const;
const TYPE_LABEL_KEYS: Record<string, string> = {
  car: "garage_title_cars",
  truck: "garage_title_trucks",
  motorcycle: "garage_title_motorcycles",
  boat: "garage_title_boats",
  plane: "garage_title_planes",
  train: "garage_title_trains",
  hot_wheels: "garage_title_hot_wheels",
};

const TYPE_COLORS: Record<string, string> = {
  car: "hsl(var(--primary))",
  truck: "hsl(217 91% 60%)",
  motorcycle: "hsl(142 71% 45%)",
  boat: "hsl(189 94% 43%)",
  plane: "hsl(258 90% 66%)",
  train: "hsl(38 92% 50%)",
  hot_wheels: "hsl(330 81% 60%)",
};

// Rarity 1–10 (1 = very common, 10 = mythic)
const RARITY_COLORS: string[] = [
  "hsl(0 0% 55%)",      // 1
  "hsl(0 0% 65%)",      // 2
  "hsl(215 16% 55%)",   // 3
  "hsl(142 45% 42%)",   // 4
  "hsl(160 55% 45%)",   // 5
  "hsl(189 60% 45%)",   // 6
  "hsl(217 91% 60%)",   // 7
  "hsl(258 90% 66%)",   // 8
  "hsl(38 92% 50%)",    // 9
  "hsl(48 96% 53%)",    // 10 mythic
];

function getPiePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number, innerR = 0): string {
  const deg = (rad: number) => (rad * 180) / Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const xi1 = cx + innerR * Math.cos(startAngle);
  const yi1 = cy + innerR * Math.sin(startAngle);
  const xi2 = cx + innerR * Math.cos(endAngle);
  const yi2 = cy + innerR * Math.sin(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`;
}

function PieChart({
  data,
  size = 160,
  innerRatio = 0.6,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  innerRatio?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <svg width={size} height={size} className="overflow-visible" />;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2;
  const r = R * innerRatio;
  let acc = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
      acc += d.value;
      const end = (acc / total) * 2 * Math.PI - Math.PI / 2;
      return { ...d, start, end };
    });

  const fullCircle = 2 * Math.PI;
  return (
    <svg width={size} height={size} className="overflow-visible">
      {segments.map((seg, i) => {
        const span = seg.end - seg.start;
        const isFullCircle = span >= fullCircle - 1e-6;
        if (isFullCircle) {
          const mid = seg.start + Math.PI;
          return (
            <g key={i}>
              <path
                d={getPiePath(cx, cy, R, seg.start, mid, r)}
                fill={seg.color}
                className="transition-opacity hover:opacity-90"
              />
              <path
                d={getPiePath(cx, cy, R, mid, seg.start + fullCircle, r)}
                fill={seg.color}
                className="transition-opacity hover:opacity-90"
              />
            </g>
          );
        }
        return (
          <path
            key={i}
            d={getPiePath(cx, cy, R, seg.start, seg.end, r)}
            fill={seg.color}
            className="transition-opacity hover:opacity-90"
          />
        );
      })}
    </svg>
  );
}

interface CarRow {
  id: string;
  vehicle_type: string;
  quality_rating: number | null;
  rarity_rating: number | null;
  estimated_price: number | null;
  location_name?: string | null;
  brand?: string;
  model?: string;
  year?: number;
  generation?: string | null;
  image_url?: string | null;
}

const ProfileStats = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId?: string }>();
  const [hoverBar, setHoverBar] = useState<string | null>(null);
  const isFriendView = !!friendId && friendId !== user?.id;
  const { isBlacklisted } = useBlacklist(user?.id);

  const { data: friendProfile } = useQuery({
    queryKey: ["profile-username-pinned-xp-emblem", friendId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, pinned_car_id, total_xp, emblem_slot_1, emblem_slot_2, emblem_slot_3, role, is_premium")
        .eq("user_id", friendId!)
        .maybeSingle();
      return data
        ? {
            username: data.username ?? null,
            pinned_car_id: (data as { pinned_car_id?: string | null }).pinned_car_id ?? null,
            total_xp: Number((data as { total_xp?: number }).total_xp ?? 0),
            emblem_slot_1: (data as { emblem_slot_1?: string | null }).emblem_slot_1 ?? null,
            emblem_slot_2: (data as { emblem_slot_2?: string | null }).emblem_slot_2 ?? null,
            emblem_slot_3: (data as { emblem_slot_3?: string | null }).emblem_slot_3 ?? null,
            role: (data as { role?: string | null }).role ?? "user",
            is_premium: Boolean((data as { is_premium?: boolean | null }).is_premium ?? false),
          }
        : null;
    },
    enabled: isFriendView && !!friendId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["profile-pinned-self-xp-emblem", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("pinned_car_id, username, total_xp, emblem_slot_1, emblem_slot_2, emblem_slot_3, role, is_premium")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data
        ? {
            pinned_car_id: (data as { pinned_car_id?: string | null }).pinned_car_id ?? null,
            username: (data as { username?: string | null }).username ?? null,
            total_xp: Number((data as { total_xp?: number }).total_xp ?? 0),
            emblem_slot_1: (data as { emblem_slot_1?: string | null }).emblem_slot_1 ?? null,
            emblem_slot_2: (data as { emblem_slot_2?: string | null }).emblem_slot_2 ?? null,
            emblem_slot_3: (data as { emblem_slot_3?: string | null }).emblem_slot_3 ?? null,
            role: (data as { role?: string | null }).role ?? "user",
            is_premium: Boolean((data as { is_premium?: boolean | null }).is_premium ?? false),
          }
        : null;
    },
    enabled: !isFriendView && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: myPinnedCar } = useQuery({
    queryKey: ["my-pinned-car", user?.id, myProfile?.pinned_car_id],
    queryFn: async () => {
      if (!user?.id) return null;
      const pid = myProfile?.pinned_car_id;
      if (pid) {
        const { data } = await supabase
          .from("cars")
          .select("id, brand, model, year, generation, image_url")
          .eq("id", pid)
          .eq("user_id", user.id)
          .maybeSingle();
        return data as { id: string; brand: string; model: string; year: number; generation: string | null; image_url: string | null } | null;
      }
      const { data } = await supabase
        .from("cars")
        .select("id, brand, model, year, generation, image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string; brand: string; model: string; year: number; generation: string | null; image_url: string | null } | null;
    },
    enabled: !isFriendView && !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: friendPinnedCar } = useQuery({
    queryKey: ["friend-pinned-car", friendId, friendProfile?.pinned_car_id],
    queryFn: async () => {
      const pid = friendProfile?.pinned_car_id;
      if (!pid || !friendId) return null;
      const { data } = await supabase
        .from("cars")
        .select("id, brand, model, year, generation, image_url")
        .eq("id", pid)
        .eq("user_id", friendId)
        .maybeSingle();
      return data as { id: string; brand: string; model: string; year: number; generation: string | null; image_url: string | null } | null;
    },
    enabled: isFriendView && !!friendId && !!friendProfile?.pinned_car_id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: isFriend = false, isLoading: loadingFriend } = useQuery({
    queryKey: ["is-friend", user?.id, friendId],
    queryFn: async () => {
      if (!user?.id || !friendId) return false;
      const { data } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      return !!data;
    },
    enabled: isFriendView && !!user?.id && !!friendId,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (isFriendView && !loadingFriend && !isFriend) {
      navigate("/friends", { replace: true });
    }
  }, [isFriendView, loadingFriend, isFriend, navigate]);

  useEffect(() => {
    if (isFriendView && friendId && user?.id && isBlacklisted(friendId)) {
      navigate("/friends", { replace: true });
    }
  }, [isFriendView, friendId, user?.id, isBlacklisted, navigate]);

  const targetUserId = isFriendView ? friendId! : user?.id ?? null;

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["profile-stats-cars", targetUserId, isFriendView],
    queryFn: async () => {
      const cols = isFriendView
        ? "id, vehicle_type, quality_rating, rarity_rating, estimated_price, brand, model, year, generation, image_url"
        : "id, vehicle_type, quality_rating, rarity_rating, estimated_price, location_name, brand";
      const { data } = await supabase
        .from("cars")
        .select(cols)
        .eq("user_id", targetUserId!);
      return (data as unknown as CarRow[]) ?? [];
    },
    enabled: !!targetUserId && (!isFriendView || isFriend),
    staleTime: 2 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const carsExclMini = cars.filter((c) => (c.vehicle_type || "car") !== "hot_wheels");
    const byType: Record<string, number> = {};
    const byRarity: Record<number, number> = {};
    let sumQuality = 0;
    let sumRarity = 0;
    let countWithRatings = 0;
    const valueByType: Record<string, number> = {};
    let valueTotal = 0;

    for (const c of cars) {
      const vt = c.vehicle_type || "car";
      const r = c.rarity_rating ?? 5;
      if (vt !== "hot_wheels") {
        byType[vt] = (byType[vt] || 0) + 1;
      }
      byRarity[r] = (byRarity[r] || 0) + 1;
    }
    for (const c of carsExclMini) {
      const vt = c.vehicle_type || "car";
      const q = c.quality_rating ?? 3;
      const r = c.rarity_rating ?? 5;
      sumQuality += q;
      sumRarity += r;
      countWithRatings++;
      const val = c.estimated_price != null && c.estimated_price > 0 ? Number(c.estimated_price) : 0;
      valueTotal += val;
      valueByType[vt] = (valueByType[vt] || 0) + val;
    }

    const totalSpots = carsExclMini.length;
    const avgQuality = countWithRatings ? Math.round((sumQuality / countWithRatings) * 10) / 10 : 0;
    const avgRarity = countWithRatings ? Math.round((sumRarity / countWithRatings) * 10) / 10 : 0;
    const carLevel = countWithRatings ? Math.round(((sumQuality + sumRarity) / 2 / countWithRatings) * 10) / 10 : 0;

    const typeData = VEHICLE_TYPES_ORDER.filter((k) => (byType[k] || 0) > 0).map((k) => ({
      label: k,
      value: byType[k] || 0,
      color: TYPE_COLORS[k] || "hsl(var(--muted-foreground))",
    }));

    const rarityData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      .filter((n) => (byRarity[n] || 0) > 0)
      .map((n) => ({
        label: String(n),
        value: byRarity[n] || 0,
        color: RARITY_COLORS[n - 1] ?? "hsl(var(--muted-foreground))",
      }));

    const maxVal = Math.max(valueTotal, ...Object.values(valueByType), 1);
    const hasAnyPrice = carsExclMini.some((c) => c.estimated_price != null && c.estimated_price > 0);

    const rarityCountExact5 = byRarity[5] || 0;
    const rarityCountExact6 = byRarity[6] || 0;
    const rarityCountExact7 = byRarity[7] || 0;
    const rarityCountExact8 = byRarity[8] || 0;
    const rarityCountExact9 = byRarity[9] || 0;
    const rarityCountExact10 = byRarity[10] || 0;

    const distinctLocations = new Set(
      carsExclMini
        .map((c) => {
          const name = c.location_name?.trim();
          if (!name) return null;
          const parts = name.split(",");
          return parts[parts.length - 1]?.trim().toLowerCase() || null;
        })
        .filter(Boolean)
    ).size;
    const distinctBrands = new Set(
      carsExclMini.map((c) => c.brand?.toLowerCase().trim()).filter(Boolean)
    ).size;

    const CLIO_GENS = ["I", "II", "III", "IV", "V", "VI"];
    const clioGenerationsSpotted = (() => {
      const clioCars = carsExclMini.filter(
        (c) =>
          c.brand?.toLowerCase().trim() === "renault" &&
          c.model?.toLowerCase().trim() === "clio" &&
          c.generation?.trim()
      );
      const gens = new Set(
        clioCars
          .map((c) => (c.generation ?? "").trim().toUpperCase())
          .filter((g) => CLIO_GENS.includes(g))
      );
      return gens.size;
    })();

    return {
      totalSpots,
      avgQuality,
      avgRarity,
      carLevel,
      typeData,
      rarityData,
      valueTotal,
      valueByType,
      maxVal,
      hasAnyPrice,
      rarityCountExact5,
      rarityCountExact6,
      rarityCountExact7,
      rarityCountExact8,
      rarityCountExact9,
      rarityCountExact10,
      distinctLocations,
      distinctBrands,
      clioGenerationsSpotted,
    };
  }, [cars]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = stats.totalSpots > 0;

  const displayName = isFriendView ? (friendProfile?.username ?? (t.friends_this_friend as string)) : (myProfile?.username ?? user?.email ?? null);
  const profileForLevel = isFriendView ? friendProfile : myProfile;
  const totalXp = profileForLevel?.total_xp ?? 0;
  const levelProgress = getLevelProgress(totalXp);

  return (
    <div className="min-h-screen bg-background relative pb-8">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 sticky top-0 z-10 bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate(isFriendView ? "/friends" : "/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">
          {isFriendView
            ? ((t.profile_stats_title as string) + (displayName ? ` · ${displayName}` : ""))
            : (t.profile_stats_title as string)}
        </h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Level bar under user name */}
        <section className="rounded-xl border border-border bg-card p-4">
          {displayName && (
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              {displayName}
              <UserRoleBadge role={(isFriendView ? friendProfile : myProfile)?.role} isPremium={(isFriendView ? friendProfile : myProfile)?.is_premium} />
            </p>
          )}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">
                {(t.level_label as string)} {levelProgress.level}
                {levelProgress.level >= 100 ? ` (${t.level_max as string})` : ""}
              </span>
              {levelProgress.level < 100 && (
                <span className="text-muted-foreground tabular-nums">
                  {levelProgress.xpInCurrentLevel.toLocaleString()} / {(levelProgress.xpRequiredForCurrentLevel).toLocaleString()} XP
                </span>
              )}
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${levelProgress.progressFraction * 100}%` }}
              />
            </div>
          </div>
        </section>

        {isFriendView ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => navigate(`/friends/${friendId}/garage`)}
              className="w-full text-left block"
            >
              <div className="relative aspect-[2/1] min-h-[100px] bg-muted/30">
                {(friendPinnedCar ?? cars[0])?.image_url ? (
                  <>
                    <img
                      src={(friendPinnedCar ?? cars[0])!.image_url!}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-base font-bold text-white drop-shadow-md">
                    {(t.friends_garage_of as (name: string) => string)(displayName || "")}
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {(friendPinnedCar ?? cars[0])
                      ? `${(friendPinnedCar ?? cars[0])!.brand} ${(friendPinnedCar ?? cars[0])!.model}${(friendPinnedCar ?? cars[0])!.generation ? ` ${(friendPinnedCar ?? cars[0])!.generation}` : ""} · ${(friendPinnedCar ?? cars[0])!.year}`
                      : (t.profile_stats_spots as string) + ` ${cars.length}`}
                  </p>
                </div>
              </div>
              <div className="p-3 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t.friends_view_garage as string}</span>
                <span className="text-primary text-sm font-medium">→</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => navigate("/garage-menu")}
              className="w-full text-left block"
            >
              <div className="relative aspect-[2/1] min-h-[100px] bg-muted/30">
                {myPinnedCar?.image_url ? (
                  <>
                    <img
                      src={myPinnedCar.image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-base font-bold text-white drop-shadow-md">
                    {t.garage_title as string}
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {myPinnedCar
                      ? `${myPinnedCar.brand} ${myPinnedCar.model}${myPinnedCar.generation ? ` ${myPinnedCar.generation}` : ""} · ${myPinnedCar.year}`
                      : (t.profile_stats_spots as string) + ` ${cars.length}`}
                  </p>
                </div>
              </div>
              <div className="p-3 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t.friends_view_garage as string}</span>
                <span className="text-primary text-sm font-medium">→</span>
              </div>
            </button>
          </div>
        )}

        {!hasData ? (
          <p className="text-muted-foreground text-center py-8">{t.profile_stats_no_data as string}</p>
        ) : (
          <>
            {/* Emblems tile (3 chosen blasons) */}
            <section
              className="rounded-xl border border-border bg-card p-4"
              role={!isFriendView ? "button" : undefined}
              tabIndex={!isFriendView ? 0 : undefined}
              onClick={!isFriendView ? () => navigate("/profile/achievements") : undefined}
              onKeyDown={!isFriendView ? (e) => e.key === "Enter" && navigate("/profile/achievements") : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base">{t.stats_emblems_title as string}</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  profileForLevel?.emblem_slot_1 ?? null,
                  profileForLevel?.emblem_slot_2 ?? null,
                  profileForLevel?.emblem_slot_3 ?? null,
                ].map((aid, i) => {
                  const resolvedAid = (aid === "rarity_hunter" ? "rarity_hunter_5" : aid) as AchievementId | null;
                  const level = resolvedAid
                    ? getAchievementLevel(resolvedAid, getAchievementValue(resolvedAid, {
                      spotCount: stats.totalSpots,
                      distinctLocations: stats.distinctLocations,
                      rarityCountExact5: stats.rarityCountExact5,
                      rarityCountExact6: stats.rarityCountExact6,
                      rarityCountExact7: stats.rarityCountExact7,
                      rarityCountExact8: stats.rarityCountExact8,
                      rarityCountExact9: stats.rarityCountExact9,
                      rarityCountExact10: stats.rarityCountExact10,
                      distinctBrands: stats.distinctBrands,
                      clioGenerationsSpotted: stats.clioGenerationsSpotted,
                    }))
                    : 0;
                  const label = resolvedAid ? (t[ACHIEVEMENTS[resolvedAid].labelKey as keyof typeof t] as string) : "—";
                  const shape = resolvedAid ? ACHIEVEMENT_SHAPES[resolvedAid] : "shield" as const;
                  return (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <Emblem level={level} shape={shape} size={56} />
                      <span className="text-xs text-muted-foreground text-center truncate w-full">{label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Pie charts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  {t.profile_stats_by_type as string}
                </p>
                {stats.typeData.length > 0 ? (
                  <>
                    <PieChart data={stats.typeData} size={140} />
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                      {stats.typeData.map((d) => (
                        <span key={d.label} className="flex items-center gap-1">
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          {t[TYPE_LABEL_KEYS[d.label] as keyof typeof t] as string} {d.value}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  {t.profile_stats_by_rarity as string}
                </p>
                {stats.rarityData.length > 0 ? (
                  <>
                    <PieChart data={stats.rarityData} size={140} />
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs">
                      {stats.rarityData.map((d) => (
                        <span key={d.label} className="flex items-center gap-1">
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          {(t[`rarity_label_${d.label}` as keyof typeof t] as string) ?? d.label} {d.value}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold tabular-nums">{stats.totalSpots}</p>
                <p className="text-xs text-muted-foreground">{t.profile_stats_spots as string}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold tabular-nums">{stats.carLevel.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{t.profile_stats_car_level as string}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold tabular-nums">{stats.avgQuality.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{t.profile_stats_avg_quality as string}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold tabular-nums">{stats.avgRarity.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{t.profile_stats_avg_rarity as string}</p>
              </div>
            </div>

            {/* Value section */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-base font-bold">{t.profile_stats_value as string}</h2>

              <div className="space-y-3">
                <div
                  className="space-y-1"
                  onMouseEnter={() => setHoverBar("total")}
                  onMouseLeave={() => setHoverBar(null)}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t.profile_stats_value_total as string}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {stats.hasAnyPrice ? `${Math.round(stats.valueTotal).toLocaleString("fr-FR")} €` : stats.valueTotal}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (stats.valueTotal / stats.maxVal) * 100)}%`,
                        opacity: hoverBar === "total" || hoverBar === null ? 1 : 0.4,
                      }}
                    />
                  </div>
                </div>

                {VEHICLE_TYPES_ORDER.filter((k) => (stats.valueByType[k] || 0) > 0).map((k) => (
                  <div
                    key={k}
                    className="space-y-1"
                    onMouseEnter={() => setHoverBar(k)}
                    onMouseLeave={() => setHoverBar(null)}
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {t[TYPE_LABEL_KEYS[k] as keyof typeof t] as string}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {stats.hasAnyPrice ? `${Math.round(stats.valueByType[k] ?? 0).toLocaleString("fr-FR")} €` : (stats.valueByType[k] ?? 0)}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((stats.valueByType[k] ?? 0) / stats.maxVal) * 100)}%`,
                          backgroundColor: TYPE_COLORS[k],
                          opacity: hoverBar === k || hoverBar === null ? 1 : 0.4,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileStats;
