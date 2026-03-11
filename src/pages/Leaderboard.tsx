import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import UserRoleBadge from "@/components/UserRoleBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LeaderboardSortOption = "spots" | "avg_quality" | "avg_rarity" | "car_level" | "garage_price";

interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  car_count: number;
  avg_quality: number;
  avg_rarity: number;
  car_level: number;
  total_estimated_price: number;
  role?: string | null;
  is_premium?: boolean;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sortBy, setSortBy] = useState<LeaderboardSortOption>("spots");

  const SORT_OPTIONS: { value: LeaderboardSortOption; label: string; valueLabel: string }[] = [
    { value: "spots", label: t.leaderboard_sort_spots as string, valueLabel: t.leaderboard_val_spots as string },
    { value: "avg_quality", label: t.leaderboard_sort_quality as string, valueLabel: t.leaderboard_val_quality as string },
    { value: "avg_rarity", label: t.leaderboard_sort_rarity as string, valueLabel: t.leaderboard_val_rarity as string },
    { value: "car_level", label: t.leaderboard_sort_level as string, valueLabel: t.leaderboard_val_level as string },
    { value: "garage_price", label: t.leaderboard_sort_garage_price as string, valueLabel: t.leaderboard_val_garage_price as string },
  ];

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase.rpc("get_leaderboard");
    if (!err && data) {
      const raw = (data as Record<string, unknown>[]) ?? [];
      const userIds = raw.map((e) => e.user_id as string);
      const { data: roles } = await supabase.from("profiles").select("user_id, role, is_premium").in("user_id", userIds);
      const roleMap = new Map(roles?.map((r: any) => [r.user_id, { role: r.role, is_premium: r.is_premium }]) || []);
      setEntries(
        raw.map((e) => ({
          user_id: e.user_id as string,
          username: (e.username as string | null) ?? null,
          avatar_url: (e.avatar_url as string | null) ?? null,
          car_count: Number(e.car_count ?? 0),
          avg_quality: Number(e.avg_quality ?? 0),
          avg_rarity: Number(e.avg_rarity ?? 0),
          car_level: Number(e.car_level ?? 0),
          total_estimated_price: Number(e.total_estimated_price ?? 0),
          role: roleMap.get(e.user_id as string)?.role ?? null,
          is_premium: roleMap.get(e.user_id as string)?.is_premium ?? false,
        }))
      );
    } else {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const sortedEntries = useMemo(() => {
    const list = [...entries];
    switch (sortBy) {
      case "spots":
        return list.sort((a, b) => Number(b.car_count) - Number(a.car_count));
      case "avg_quality":
        return list.sort((a, b) => (b.avg_quality ?? 0) - (a.avg_quality ?? 0));
      case "avg_rarity":
        return list.sort((a, b) => (b.avg_rarity ?? 0) - (a.avg_rarity ?? 0));
      case "car_level":
        return list.sort((a, b) => (b.car_level ?? 0) - (a.car_level ?? 0));
      case "garage_price":
        return list.sort((a, b) => (b.total_estimated_price ?? 0) - (a.total_estimated_price ?? 0));
      default:
        return list;
    }
  }, [entries, sortBy]);

  const getDisplayValue = (entry: LeaderboardEntry) => {
    switch (sortBy) {
      case "spots":
        return String(entry.car_count);
      case "avg_quality":
        return (entry.avg_quality ?? 0).toFixed(1);
      case "avg_rarity":
        return (entry.avg_rarity ?? 0).toFixed(1);
      case "car_level":
        return (entry.car_level ?? 0).toFixed(1);
      case "garage_price":
        return (entry.total_estimated_price ?? 0) >= 0
          ? `${Math.round(entry.total_estimated_price ?? 0).toLocaleString("fr-FR")} €`
          : "—";
      default:
        return String(entry.car_count);
    }
  };

  const getValueLabel = () => SORT_OPTIONS.find((o) => o.value === sortBy)?.valueLabel ?? "spots";

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-gray-300" />;
    if (rank === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="flex h-6 w-6 items-center justify-center text-sm font-bold text-muted-foreground">{rank + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.leaderboard_title as string}</h1>
        <div className="ml-auto">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as LeaderboardSortOption)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder={t.leaderboard_sort_by as string} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading leaderboard...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <p className="text-muted-foreground">{t.error as string}</p>
            <Button onClick={fetchLeaderboard}>{t.retry as string}</Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">{t.leaderboard_no_spots as string}</h3>
            <p className="text-muted-foreground text-sm mt-1">{t.leaderboard_no_spots_desc as string}</p>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {sortedEntries.map((entry, i) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                  entry.user_id === user?.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-card"
                } ${i < 3 ? "shadow-md" : ""}`}
              >
                <div className="shrink-0">{getRankIcon(i)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate flex items-center gap-1">
                    {entry.username || (t.leaderboard_anonymous as string)}
                    <UserRoleBadge role={entry.role} isPremium={entry.is_premium} />
                    {entry.user_id === user?.id && (
                      <span className="ml-1 text-xs text-primary font-normal">{t.leaderboard_you as string}</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg leading-none">{getDisplayValue(entry)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{getValueLabel()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
