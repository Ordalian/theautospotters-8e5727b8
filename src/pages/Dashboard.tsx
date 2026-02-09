import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Car, Users, Brain, Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [latestCarImage, setLatestCarImage] = useState<string | null>(null);
  const [carCount, setCarCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchLatestCar = async () => {
      const { data } = await supabase
        .from("cars")
        .select("image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setLatestCarImage(data[0].image_url);
      }
      const { count } = await supabase
        .from("cars")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setCarCount(count || 0);
    };
    fetchLatestCar();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const tiles = [
    {
      title: "My Garage",
      subtitle: `${carCount} car${carCount !== 1 ? "s" : ""} spotted`,
      icon: Car,
      image: latestCarImage,
      onClick: () => navigate("/garage"),
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Friends' Garages",
      subtitle: "Coming soon",
      icon: Users,
      image: null,
      onClick: () => {},
      gradient: "from-blue-500/20 to-blue-500/5",
      disabled: true,
    },
    {
      title: "The AutoSpotter",
      subtitle: "AI car recognition",
      icon: Brain,
      image: null,
      onClick: () => navigate("/autospotter"),
      gradient: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      title: "Leaderboards",
      subtitle: "Coming soon",
      icon: Trophy,
      image: null,
      onClick: () => {},
      gradient: "from-amber-500/20 to-amber-500/5",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AutoSpot</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Dashboard Grid */}
      <main className="p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-medium text-muted-foreground mb-6">
          Hey, {user?.email?.split("@")[0]} 👋
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <button
              key={tile.title}
              onClick={tile.onClick}
              disabled={tile.disabled}
              className={`relative group overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${tile.gradient} p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 aspect-square`}
            >
              <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/60 backdrop-blur-sm p-4">
                {tile.image ? (
                  <div className="flex-1 overflow-hidden rounded-lg mb-2">
                    <img
                      src={tile.image}
                      alt="Latest spot"
                      className="h-full w-full object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <tile.icon className="h-12 w-12 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm leading-tight">{tile.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{tile.subtitle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
