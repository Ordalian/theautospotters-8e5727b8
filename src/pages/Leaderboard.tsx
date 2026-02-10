import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  car_count: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (!error && data) {
        setEntries(data as LeaderboardEntry[]);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-gray-300" />;
    if (rank === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="flex h-6 w-6 items-center justify-center text-sm font-bold text-muted-foreground">{rank + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Leaderboard</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading leaderboard...</div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No spots yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Be the first to spot a car!</p>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {entries.map((entry, i) => (
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
                  <p className="font-bold text-sm truncate">
                    {entry.username || "Anonymous Spotter"}
                    {entry.user_id === user?.id && (
                      <span className="ml-2 text-xs text-primary font-normal">(you)</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg leading-none">{entry.car_count}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">spots</p>
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
