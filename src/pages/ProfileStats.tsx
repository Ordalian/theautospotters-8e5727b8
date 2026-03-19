import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { getLevelProgress } from "@/lib/leveling";
import { ACHIEVEMENTS, ACHIEVEMENT_SHAPES, getAchievementLevel, getAchievementValue, type AchievementId } from "@/lib/achievements";
import { Emblem } from "@/components/Emblem";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import UserRoleBadge from "@/components/UserRoleBadge";
import SignedCarImage from "@/components/SignedCarImage";

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

const RARITY_COLORS: string[] = [
  "hsl(0 0% 55%)",
  "hsl(0 0% 65%)",
  "hsl(215 16% 55%)",
  "hsl(142 45% 42%)",
  "hsl(160 55% 45%)",
  "hsl(189 60% 45%)",
  "hsl(217 91% 60%)",
  "hsl(258 90% 66%)",
  "hsl(38 92% 50%)",
  "hsl(48 96% 53%)",
];

function getPiePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number, innerR = 0): string {
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
  const segments = data.filter((d) => d.value > 0).map((d) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    return { ...d, path: getPiePath(cx, cy, R, start, end, r) };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {segments.map((segment) => (
        <path key={segment.label} d={segment.path} fill={segment.color} stroke="hsl(var(--background))" strokeWidth="2" />
      ))}
    </svg>
  );
}

type ProfileRow = {
  username: string | null;
  total_xp: number | null;
  role: string | null;
  is_premium: boolean | null;
  pinned_car_id: string | null;
  emblem_slot_1: string | null;
  emblem_slot_2: string | null;
  emblem_slot_3: string | null;
};

type CarRow = {
  id: string;
  vehicle_type: string | null;
  quality_rating: number | null;
  rarity_rating: number | null;
  estimated_price: number | null;
  location_name: string | null;
  brand: string;
  model: string;
  year: number;
  generation: string | null;
  image_url: string | null;
};

const clampRarity = (value: number | null | undefined) => Math.min(10, Math.max(1, Math.round(value ?? 5)));

const ProfileStats = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const isFriendView = !!friendId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [hoverBar, setHoverBar] = useState<string | null>(null);

  const targetUserId = friendId ?? user?.id ?? null;

  const { data: myProfile, isLoading: myProfileLoading } = useQuery({
    queryKey: ["profile-stats-self-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, total_xp, role, is_premium, pinned_car_id, emblem_slot_1, emblem_slot_2, emblem_slot_3")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },
    enabled: !!user?.id && !isFriendView,
    staleTime: 60_000,
  });

  const { data: friendProfile, isLoading: friendProfileLoading } = useQuery({
    queryKey: ["profile-stats-friend-profile", friendId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("username, total_xp, role, is_premium, pinned_car_id, emblem_slot_1, emblem_slot_2, emblem_slot_3")
        .eq("user_id", friendId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },
    enabled: !!friendId,
    staleTime: 60_000,
  });

  const { data: cars = [], isLoading: carsLoading } = useQuery({
    queryKey: ["profile-stats-cars", targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("id, vehicle_type, quality_rating, rarity_rating, estimated_price, location_name, brand, model, year, generation, image_url")
        .eq("user_id", targetUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as CarRow[] | null) ?? [];
    },
    enabled: !!targetUserId,
    staleTime: 60_000,
  });

  useEffect(() => {
    setHoverBar(null);
  }, [targetUserId]);

  const profileForLevel = isFriendView ? friendProfile : myProfile;
  const displayName = profileForLevel?.username || (isFriendView ? "—" : user?.email?.split("@")[0] || "—");
  const loading = (isFriendView ? friendProfileLoading : myProfileLoading) || carsLoading;

  const pinnedCar = useMemo(() => {
    if (!cars.length) return null;
    const pinnedId = profileForLevel?.pinned_car_id;
    return cars.find((car) => car.id === pinnedId) ?? cars[0] ?? null;
  }, [cars, profileForLevel?.pinned_car_id]);

  const stats = useMemo(() => {
    const visibleCars = cars.filter((car) => (car.vehicle_type ?? "car") !== "hot_wheels");
    const typeCounts = new Map<string, number>();
    const rarityCounts = new Map<string, number>();
    const valueByType = Object.fromEntries(VEHICLE_TYPES_ORDER.map((key) => [key, 0])) as Record<(typeof VEHICLE_TYPES_ORDER)[number], number>;
    const locations = new Set<string>();
    const brands = new Set<string>();
    const clioGenerations = new Set<string>();
    let qualitySum = 0;
    let raritySum = 0;
    let ratedCount = 0;
    let valueTotal = 0;
    let hasAnyPrice = false;
    let rarityCountExact5 = 0;
    let rarityCountExact6 = 0;
    let rarityCountExact7 = 0;
    let rarityCountExact8 = 0;
    let rarityCountExact9 = 0;
    let rarityCountExact10 = 0;

    for (const car of cars) {
      const type = car.vehicle_type ?? "car";
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }

    for (const car of visibleCars) {
      const quality = car.quality_rating ?? 3;
      const rarity = car.rarity_rating ?? 5;
      qualitySum += quality;
      raritySum += rarity;
      ratedCount += 1;

      const rarityBucket = clampRarity(rarity).toString();
      rarityCounts.set(rarityBucket, (rarityCounts.get(rarityBucket) ?? 0) + 1);

      if (rarityBucket === "5") rarityCountExact5 += 1;
      if (rarityBucket === "6") rarityCountExact6 += 1;
      if (rarityBucket === "7") rarityCountExact7 += 1;
      if (rarityBucket === "8") rarityCountExact8 += 1;
      if (rarityBucket === "9") rarityCountExact9 += 1;
      if (rarityBucket === "10") rarityCountExact10 += 1;

      if (car.location_name?.trim()) locations.add(car.location_name.trim().toLowerCase());
      if (car.brand?.trim()) brands.add(car.brand.trim().toLowerCase());
      if (car.model?.toLowerCase().includes("clio")) {
        clioGenerations.add((car.generation?.trim() || `${car.year}`).toLowerCase());
      }

      if (car.estimated_price && car.estimated_price > 0) {
        valueTotal += car.estimated_price;
        hasAnyPrice = true;
        const type = car.vehicle_type ?? "car";
        if (type in valueByType) {
          valueByType[type as keyof typeof valueByType] += car.estimated_price;
        }
      }
    }

    const totalSpots = visibleCars.length;
    const avgQuality = ratedCount ? qualitySum / ratedCount : 0;
    const avgRarity = ratedCount ? raritySum / ratedCount : 0;
    const carLevel = ratedCount ? (avgQuality + avgRarity) / 2 : 0;
    const maxVal = Math.max(1, valueTotal, ...Object.values(valueByType));

    return {
      totalSpots,
      avgQuality,
      avgRarity,
      carLevel,
      valueTotal,
      valueByType,
      maxVal,
      hasAnyPrice,
      distinctLocations: locations.size,
      distinctBrands: brands.size,
      clioGenerationsSpotted: clioGenerations.size,
      rarityCountExact5,
      rarityCountExact6,
      rarityCountExact7,
      rarityCountExact8,
      rarityCountExact9,
      rarityCountExact10,
      typeData: Array.from(typeCounts.entries()).map(([label, value]) => ({
        label,
        value,
        color: TYPE_COLORS[label] ?? "hsl(var(--muted-foreground))",
      })),
      rarityData: Array.from(rarityCounts.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([label, value]) => ({
          label,
          value,
          color: RARITY_COLORS[Number(label) - 1] ?? "hsl(var(--muted-foreground))",
        })),
    };
  }, [cars]);

  const levelProgress = getLevelProgress(profileForLevel?.total_xp ?? 0);
  const hasData = cars.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(isFriendView ? "/friends" : "/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold truncate">{displayName}</h1>
          <p className="text-[10px] text-muted-foreground truncate">{t.profile_tile_stats as string}</p>
        </div>
        <UserRoleBadge role={profileForLevel?.role ?? undefined} isPremium={profileForLevel?.is_premium ?? undefined} />
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        <section className="rounded-xl border border-border bg-card p-4">
          {displayName && (
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              {displayName}
              <UserRoleBadge role={profileForLevel?.role ?? undefined} isPremium={profileForLevel?.is_premium ?? undefined} />
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
                  {levelProgress.xpInCurrentLevel.toLocaleString()} / {levelProgress.xpRequiredForCurrentLevel.toLocaleString()} XP
                </span>
              )}
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${levelProgress.progressFraction * 100}%` }} />
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => navigate(isFriendView ? `/friends/${friendId}/garage` : "/garage-menu")}
            className="w-full text-left block"
          >
            <div className="relative aspect-[2/1] min-h-[100px] bg-muted/30">
              {pinnedCar?.image_url ? (
                <>
                  <SignedCarImage
                    src={pinnedCar.image_url}
                    alt={`${pinnedCar.brand} ${pinnedCar.model}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    fallback={
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Car className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    }
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
                  {isFriendView ? (t.friends_garage_of as (name: string) => string)(displayName || "") : (t.garage_title as string)}
                </h2>
                <p className="text-xs text-white/80 mt-0.5">
                  {pinnedCar
                    ? `${pinnedCar.brand} ${pinnedCar.model}${pinnedCar.generation ? ` ${pinnedCar.generation}` : ""} · ${pinnedCar.year}`
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

        {!hasData ? (
          <p className="text-muted-foreground text-center py-8">{t.profile_stats_no_data as string}</p>
        ) : (
          <>
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
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
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
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
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

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-base font-bold">{t.profile_stats_value as string}</h2>

              <div className="space-y-3">
                <div className="space-y-1" onMouseEnter={() => setHoverBar("total")} onMouseLeave={() => setHoverBar(null)}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t.profile_stats_value_total as string}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {stats.hasAnyPrice ? `${Math.round(stats.valueTotal).toLocaleString("fr-FR")} €` : stats.valueTotal}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, (stats.valueTotal / stats.maxVal) * 100)}%`, opacity: hoverBar === "total" || hoverBar === null ? 1 : 0.4 }}
                    />
                  </div>
                </div>

                {VEHICLE_TYPES_ORDER.filter((k) => (stats.valueByType[k] || 0) > 0).map((k) => (
                  <div key={k} className="space-y-1" onMouseEnter={() => setHoverBar(k)} onMouseLeave={() => setHoverBar(null)}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{t[TYPE_LABEL_KEYS[k] as keyof typeof t] as string}</span>
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
