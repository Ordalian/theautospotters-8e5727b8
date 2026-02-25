import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

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
  "hsl(0 84% 60%)",
  "hsl(25 95% 53%)",
  "hsl(45 93% 47%)",
  "hsl(95 55% 45%)",
  "hsl(142 71% 45%)",
  "hsl(189 94% 43%)",
  "hsl(258 90% 66%)",
  "hsl(280 67% 58%)",
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

  return (
    <svg width={size} height={size} className="overflow-visible">
      {segments.map((seg, i) => (
        <path
          key={i}
          d={getPiePath(cx, cy, R, seg.start, seg.end, r)}
          fill={seg.color}
          className="transition-opacity hover:opacity-90"
        />
      ))}
    </svg>
  );
}

interface CarRow {
  id: string;
  vehicle_type: string;
  quality_rating: number | null;
  rarity_rating: number | null;
}

const ProfileStats = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [hoverBar, setHoverBar] = useState<string | null>(null);

  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["profile-stats-cars", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("id, vehicle_type, quality_rating, rarity_rating")
        .eq("user_id", user!.id);
      return (data as CarRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    const byRarity: Record<number, number> = {};
    let sumQuality = 0;
    let sumRarity = 0;
    let countWithRatings = 0;
    const valueByType: Record<string, number> = {};
    let valueTotal = 0;

    for (const c of cars) {
      const vt = c.vehicle_type || "car";
      const q = c.quality_rating ?? 3;
      const r = c.rarity_rating ?? 5;

      if (vt !== "hot_wheels") {
        byType[vt] = (byType[vt] || 0) + 1;
      }
      byRarity[r] = (byRarity[r] || 0) + 1;
      sumQuality += q;
      sumRarity += r;
      countWithRatings++;
      const val = q * r;
      valueTotal += val;
      valueByType[vt] = (valueByType[vt] || 0) + val;
    }

    const totalSpots = cars.length;
    const spotsExclMini = cars.filter((c) => (c.vehicle_type || "car") !== "hot_wheels").length;
    const avgQuality = countWithRatings ? Math.round((sumQuality / countWithRatings) * 10) / 10 : 0;
    const avgRarity = countWithRatings ? Math.round((sumRarity / countWithRatings) * 10) / 10 : 0;
    const carLevel = countWithRatings ? Math.round(((sumQuality + sumRarity) / 2 / countWithRatings) * 10) / 10 : 0;

    const typeData = VEHICLE_TYPES_ORDER.filter((k) => (byType[k] || 0) > 0).map((k) => ({
      label: k,
      value: byType[k] || 0,
      color: TYPE_COLORS[k] || "hsl(var(--muted-foreground))",
    }));

    const rarityData = [1, 2, 3, 4, 5, 6, 7, 8]
      .filter((n) => (byRarity[n] || 0) > 0)
      .map((n) => ({
        label: String(n),
        value: byRarity[n] || 0,
        color: RARITY_COLORS[n - 1] ?? "hsl(var(--muted-foreground))",
      }));

    const maxVal = Math.max(valueTotal, ...Object.values(valueByType), 1);

    return {
      totalSpots,
      spotsExclMini,
      avgQuality,
      avgRarity,
      carLevel,
      typeData,
      rarityData,
      valueTotal,
      valueByType,
      maxVal,
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

  return (
    <div className="min-h-screen bg-background relative pb-8">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 sticky top-0 z-10 bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.profile_stats_title as string}</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {!hasData ? (
          <p className="text-muted-foreground text-center py-8">{t.profile_stats_no_data as string}</p>
        ) : (
          <>
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
                          {(t.profile_stats_rarity_level as (n: number) => string)(Number(d.label))} {d.value}
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
              <p className="text-xs text-muted-foreground">{t.profile_stats_value_estimated as string}</p>

              <div className="space-y-3">
                <div
                  className="space-y-1"
                  onMouseEnter={() => setHoverBar("total")}
                  onMouseLeave={() => setHoverBar(null)}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t.profile_stats_value_total as string}</span>
                    <span className="tabular-nums text-muted-foreground">{stats.valueTotal}</span>
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

                {([...VEHICLE_TYPES_ORDER, "hot_wheels"] as const).filter((k) => (stats.valueByType[k] || 0) > 0).map((k) => (
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
                      <span className="tabular-nums text-muted-foreground">{stats.valueByType[k] ?? 0}</span>
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
