import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Car, Users, Brain, Trophy, LogOut, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import ItalianFlagBg from "@/components/ItalianFlagBg";
import { useQuery } from "@tanstack/react-query";

const DashboardMap = lazy(() => import("@/components/DashboardMap"));

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const [carsRes, profileRes, friendsPendingRes] = await Promise.all([
        supabase
          .from("cars")
          .select("id, image_url, latitude, longitude, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("username").eq("user_id", user!.id).maybeSingle(),
        supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .eq("addressee_id", user!.id)
          .eq("status", "pending"),
      ]);

      const cars = carsRes.data || [];
      const latestCarImage = cars.length > 0 ? cars[0].image_url : null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const mapSpots = cars
        .filter((c) => c.latitude && c.longitude && c.created_at >= sevenDaysAgo)
        .map((c) => ({ id: c.id, latitude: c.latitude!, longitude: c.longitude! }));

      const lastPosition =
        cars.filter((c) => c.latitude != null && c.longitude != null)[0] ?? null;
      const mapCenter = lastPosition
        ? { lat: lastPosition.latitude!, lng: lastPosition.longitude! }
        : null;

      return {
        latestCarImage,
        carCount: cars.length,
        mapSpots,
        mapCenter,
        username: profileRes.data?.username ?? null,
        friendNotificationCount: friendsPendingRes.count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const latestCarImage = data?.latestCarImage ?? null;
  const carCount = data?.carCount ?? 0;
  const mapSpots = data?.mapSpots ?? [];
  const mapCenter = data?.mapCenter ?? null;
  const displayName = data?.username?.trim() || user?.email?.split("@")[0] || "Spotter";
  const friendNotificationCount = data?.friendNotificationCount ?? 0;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const tiles = [
    { title: "My Garage", subtitle: `${carCount} car${carCount !== 1 ? "s" : ""} spotted`, icon: Car, image: latestCarImage, onClick: () => navigate("/garage"), gradient: "from-primary/20 to-primary/5", notificationCount: 0 },
    { title: "Friends' Garages", subtitle: "See your friends", icon: Users, image: null, onClick: () => navigate("/friends"), gradient: "from-blue-500/20 to-blue-500/5", notificationCount: friendNotificationCount },
    { title: "The AutoSpotter", subtitle: "AI car recognition", icon: Brain, image: null, onClick: () => navigate("/autospotter"), gradient: "from-emerald-500/20 to-emerald-500/5", notificationCount: 0 },
    { title: "Leaderboard", subtitle: "Top spotters", icon: Trophy, image: null, onClick: () => navigate("/leaderboard"), gradient: "from-amber-500/20 to-amber-500/5", notificationCount: 0 },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <ItalianFlagBg />
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AutoSpot</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}><User className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto relative z-10">
        <h2 className="text-lg font-medium text-muted-foreground mb-6">Hey, {displayName} 👋</h2>
        <div className="grid grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <button
              key={tile.title}
              onClick={tile.onClick}
              className={`relative group overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${tile.gradient} p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/30 active:scale-[0.98] aspect-square`}
            >
              <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/60 backdrop-blur-sm p-4">
                {tile.image ? (
                  <div className="flex-1 overflow-hidden rounded-lg mb-2">
                    <img src={tile.image} alt="Latest spot" className="h-full w-full object-cover rounded-lg" loading="lazy" />
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center relative">
                    {tile.title === "Friends' Garages" && tile.notificationCount > 0 ? (
                      <>
                        <Users className="h-12 w-12 text-primary fill-primary/80 animate-pulse-slow group-hover:fill-primary transition-colors" />
                        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                          {tile.notificationCount > 99 ? "99+" : tile.notificationCount}
                        </span>
                      </>
                    ) : (
                      <tile.icon className="h-12 w-12 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                    )}
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

        <button
          onClick={() => navigate("/map", { state: { mapCenter } })}
          className="mt-4 w-full rounded-2xl border border-border/50 overflow-hidden bg-card/60 backdrop-blur-sm text-left transition-all hover:scale-[1.01] hover:border-primary/30 active:scale-[0.99]"
        >
          <div className="h-44 relative">
            <Suspense fallback={<div className="h-full w-full bg-secondary/20" />}>
              <DashboardMap spots={mapSpots} center={mapCenter} />
            </Suspense>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-card/80 to-transparent" />
            <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">Spot Map</span>
              <span className="text-xs text-muted-foreground">• {mapSpots.length} located</span>
            </div>
          </div>
        </button>
      </main>
    </div>
  );
};

export default Dashboard;
