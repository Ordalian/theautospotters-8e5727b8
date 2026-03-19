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
...
                <div className="relative aspect-[2/1] min-h-[100px] bg-muted/30">
                  {(friendPinnedCar ?? cars[0])?.image_url ? (
                    <>
                      <SignedCarImage
                        src={(friendPinnedCar ?? cars[0])!.image_url!}
                        alt={`${(friendPinnedCar ?? cars[0])!.brand} ${(friendPinnedCar ?? cars[0])!.model}`}
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
                      {(t.friends_garage_of as (name: string) => string)(displayName || "")}
                    </h2>
                    <p className="text-xs text-white/80 mt-0.5">
                      {(friendPinnedCar ?? cars[0])
                        ? `${(friendPinnedCar ?? cars[0])!.brand} ${(friendPinnedCar ?? cars[0])!.model}${(friendPinnedCar ?? cars[0])!.generation ? ` ${(friendPinnedCar ?? cars[0])!.generation}` : ""} · ${(friendPinnedCar ?? cars[0])!.year}`
                        : (t.profile_stats_spots as string) + ` ${cars.length}`}
                    </p>
                  </div>
                </div>
...
                <div className="relative aspect-[2/1] min-h-[100px] bg-muted/30">
                  {myPinnedCar?.image_url ? (
                    <>
                      <SignedCarImage
                        src={myPinnedCar.image_url}
                        alt={`${myPinnedCar.brand} ${myPinnedCar.model}`}
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
