import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StreakData {
  streak: number;
  claimed_today: boolean;
  longest: number;
}

interface ClaimResult {
  streak: number;
  xp: number;
  already_claimed: boolean;
}

export function DailyStreak({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const { data: streak } = useQuery({
    queryKey: ["daily-streak", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_streak");
      if (error) throw error;
      return data as unknown as StreakData;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const handleClaim = async () => {
    if (!user || claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_daily_streak");
      if (error) throw error;
      const result = data as unknown as ClaimResult;
      if (result.already_claimed) {
        toast.info(t.streak_already_claimed as string || "Déjà réclamé aujourd'hui !");
      } else {
        toast.success(`+${result.xp} XP 🔥`);
        queryClient.invalidateQueries({ queryKey: ["daily-streak"] });
        queryClient.invalidateQueries({ queryKey: ["profile-header"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    } catch {
      toast.error(t.error as string);
    } finally {
      setClaiming(false);
    }
  };

  const currentStreak = streak?.streak ?? 0;
  const claimedToday = streak?.claimed_today ?? false;
  const days = Array.from({ length: 7 }, (_, i) => i + 1);

  if (compact) {
    return (
      <button
        onClick={handleClaim}
        disabled={claimedToday || claiming}
        className="flex items-center gap-1.5 text-sm"
      >
        <Flame className={`h-4 w-4 ${currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        <span className="font-bold tabular-nums">{currentStreak}</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          <h3 className="font-bold text-sm">{t.streak_title as string || "Streak quotidien"}</h3>
        </div>
        {!claimedToday && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {claiming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Gift className="h-3.5 w-3.5" />
            )}
            {t.streak_claim as string || "Réclamer"}
          </button>
        )}
        {claimedToday && (
          <span className="text-xs text-green-500 font-medium">✓ {t.streak_done as string || "Fait !"}</span>
        )}
      </div>

      {/* 7-day dots */}
      <div className="flex items-center gap-1.5">
        {days.map((day) => {
          const filled = day <= currentStreak;
          const isSeventh = day === 7;
          return (
            <div key={day} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`h-7 w-full rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors ${
                  filled
                    ? isSeventh
                      ? "bg-orange-500 text-white"
                      : "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isSeventh ? "🎁" : day}
              </div>
              <span className="text-[8px] text-muted-foreground tabular-nums">
                {isSeventh ? "500" : "100"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
