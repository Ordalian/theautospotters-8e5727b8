import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENTS,
  getAchievementLevel,
  getAchievementProgressInLevel,
  getAchievementValue,
  getNextThreshold,
  type AchievementId,
} from "@/lib/achievements";
import { Emblem } from "@/components/Emblem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ProfileAchievements = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pickSlot, setPickSlot] = useState<1 | 2 | 3 | null>(null);

  const { data: spotCount = 0 } = useQuery({
    queryKey: ["achievement-spot-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("cars")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .neq("vehicle_type", "hot_wheels");
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-emblem-slots", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("emblem_slot_1, emblem_slot_2, emblem_slot_3")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { emblem_slot_1: string | null; emblem_slot_2: string | null; emblem_slot_3: string | null } | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const stats = { spotCount };
  const emblemSlots: (AchievementId | null)[] = [
    (profile?.emblem_slot_1 as AchievementId) ?? null,
    (profile?.emblem_slot_2 as AchievementId) ?? null,
    (profile?.emblem_slot_3 as AchievementId) ?? null,
  ];

  const setEmblemSlot = async (slot: 1 | 2 | 3, achievementId: AchievementId | null) => {
    if (!user?.id) return;
    const col = `emblem_slot_${slot}` as "emblem_slot_1" | "emblem_slot_2" | "emblem_slot_3";
    const { error } = await supabase
      .from("profiles")
      .update({ [col]: achievementId })
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile-emblem-slots", user.id] });
    queryClient.invalidateQueries({ queryKey: ["profile-pinned-self-xp-emblem", user.id] });
    setPickSlot(null);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 sticky top-0 z-10 bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.profile_tile_achievements as string}</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Achievement list */}
        {ACHIEVEMENT_IDS.map((id) => {
          const def = ACHIEVEMENTS[id];
          const value = getAchievementValue(id, stats);
          const level = getAchievementLevel(id, value);
          const progress = getAchievementProgressInLevel(id, value);
          const nextThreshold = getNextThreshold(id, value);
          const label = t[def.labelKey as keyof typeof t] as string;
          const desc = t[`${def.labelKey}_desc` as keyof typeof t] as string | undefined;

          return (
            <div
              key={id}
              className="rounded-xl border border-border bg-card p-4 flex gap-4 items-start"
            >
              <Emblem level={level} size={56} className="shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-base">{label}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(t.achievement_level as (n: number) => string)(level)}/10
                  </span>
                </div>
                {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {value.toLocaleString()}
                      {nextThreshold != null ? ` / ${nextThreshold.toLocaleString()}` : " (max)"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seg) => {
                      const filled = level >= seg || (level === seg - 1 && progress > 0);
                      const partial = level === seg - 1 && progress > 0 && progress < 1;
                      return (
                        <div
                          key={seg}
                          className="flex-1 h-full first:rounded-l-full last:rounded-r-full overflow-hidden"
                          style={{
                            backgroundColor: filled
                              ? "hsl(var(--primary))"
                              : partial
                                ? "hsl(var(--primary) / 0.5)"
                                : "hsl(var(--muted))",
                          }}
                        >
                          {partial && (
                            <div
                              className="h-full bg-primary rounded-r-full"
                              style={{ width: `${progress * 100}%` }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Emblem slots for stats */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold text-base">{t.stats_emblems_title as string}</h2>
          <p className="text-xs text-muted-foreground">{t.stats_emblems_choose as string}</p>
          <div className="grid grid-cols-3 gap-3">
            {([1, 2, 3] as const).map((slot) => {
              const aid = emblemSlots[slot - 1];
              const level = aid ? getAchievementLevel(aid, getAchievementValue(aid, stats)) : 0;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPickSlot(slot)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Emblem level={level} size={48} />
                  <span className="text-xs text-muted-foreground">
                    {aid ? (t[ACHIEVEMENTS[aid].labelKey as keyof typeof t] as string) : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <Dialog open={pickSlot != null} onOpenChange={(open) => !open && setPickSlot(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.stats_emblems_pick as string}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {ACHIEVEMENT_IDS.map((aid) => (
              <button
                key={aid}
                type="button"
                onClick={() => pickSlot && setEmblemSlot(pickSlot, aid)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 text-left"
              >
                <Emblem level={getAchievementLevel(aid, getAchievementValue(aid, stats))} size={40} />
                <span className="font-medium">{t[ACHIEVEMENTS[aid].labelKey as keyof typeof t] as string}</span>
              </button>
            ))}
            {pickSlot && (
              <button
                type="button"
                onClick={() => setEmblemSlot(pickSlot, null)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 text-left text-muted-foreground"
              >
                <span className="w-10 h-10 flex items-center justify-center rounded bg-muted text-xs">—</span>
                <span>{t.achievement_slot_empty as string}</span>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileAchievements;
