import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Car, Users, Brain, Trophy, LogOut, User, MapPin, Gamepad2, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import { useQuery } from "@tanstack/react-query";

const DashboardMap = lazy(() => import("@/components/DashboardMap"));

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const [carsRes, profileRes, friendsPendingRes, friendshipsRes] = await Promise.all([
        supabase
          .from("cars")
          .select("id, image_url, latitude, longitude, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("username, pinned_car_id").eq("user_id", user!.id).maybeSingle() as any,
        supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .eq("addressee_id", user!.id)
          .eq("status", "pending"),
        supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`),
      ]);

      const cars = carsRes.data || [];
      const pinnedCarId = profileRes.data?.pinned_car_id ?? null;
      const pinnedCar = pinnedCarId ? cars.find((c) => c.id === pinnedCarId) : null;
      const latestCarImage = (pinnedCar?.image_url ?? cars[0]?.image_url) ?? null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const mapSpots = cars
        .filter((c) => c.latitude && c.longitude && c.created_at >= sevenDaysAgo)
        .map((c) => ({ id: c.id, latitude: c.latitude!, longitude: c.longitude! }));

      const lastPosition =
        cars.filter((c) => c.latitude != null && c.longitude != null)[0] ?? null;
      const mapCenter = lastPosition
        ? { lat: lastPosition.latitude!, lng: lastPosition.longitude! }
        : null;

      let friendSpots: { id: string; brand: string; model: string; year: number; image_url: string | null; username: string | null }[] = [];
      const friendships = friendshipsRes.data || [];
      if (friendships.length > 0) {
        const friendIds = friendships.map((f) =>
          f.requester_id === user!.id ? f.addressee_id : f.requester_id
        );
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", friendIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);
        const { data: friendCars } = await supabase
          .from("cars")
          .select("id, brand, model, year, image_url, user_id, created_at")
          .in("user_id", friendIds)
          .neq("vehicle_type", "hot_wheels")
          .order("created_at", { ascending: false })
          .limit(10);
        friendSpots = (friendCars || []).map((c) => ({
          id: c.id,
          brand: c.brand,
          model: c.model,
          year: c.year,
          image_url: c.image_url,
          username: profileMap.get(c.user_id) || null,
        }));
      }

      return {
        latestCarImage,
        carCount: cars.length,
        mapSpots,
        mapCenter,
        username: profileRes.data?.username ?? null,
        friendNotificationCount: friendsPendingRes.count ?? 0,
        friendSpots,
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
  const friendSpots = data?.friendSpots ?? [];

  const [friendsTileIndex, setFriendsTileIndex] = useState(0);
  useEffect(() => {
    if (friendSpots.length <= 1) return;
    const timer = setInterval(() => {
      setFriendsTileIndex((i) => (i + 1) % friendSpots.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [friendSpots.length]);

  const currentFriendSpot = friendSpots[friendsTileIndex] ?? null;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    if (profileMenuOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [profileMenuOpen]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-background">
        <p className="text-muted-foreground text-center">{t.error as string}</p>
        <Button onClick={() => refetch()}>{t.retry as string}</Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };


  const carsSpottedText = typeof t.dash_cars_spotted === "function" ? t.dash_cars_spotted(carCount) : `${carCount} spots`;

  const topTiles = [
    { title: t.dash_my_garage as string, subtitle: carsSpottedText, icon: Car, image: latestCarImage, onClick: () => navigate("/garage-menu"), gradient: "from-primary/20 to-primary/5", notificationCount: 0, iframe: null as string | null },
    { title: t.dash_zone_jeu as string, subtitle: t.dash_zone_jeu_sub as string, icon: Gamepad2, image: null, onClick: () => {}, gradient: "from-violet-500/20 to-violet-500/5", notificationCount: 0, iframe: null as string | null },
  ];

  const bottomTiles = [
    { title: t.dash_friends as string, subtitle: t.dash_friends_sub as string, icon: Users, image: null, onClick: () => navigate("/friends"), gradient: "from-blue-500/20 to-blue-500/5", notificationCount: friendNotificationCount, iframe: null as string | null },
    { title: t.dash_shop as string, subtitle: t.dash_shop_sub as string, icon: Store, image: null, onClick: () => {}, gradient: "from-rose-500/20 to-rose-500/5", notificationCount: 0, iframe: null as string | null },
  ];

  const smallTiles = [
    { title: t.dash_autospotter as string, subtitle: t.dash_autospotter_sub as string, icon: Brain, image: null, onClick: () => navigate("/autospotter"), gradient: "from-emerald-500/20 to-emerald-500/5", notificationCount: 0 },
    { title: t.dash_leaderboard as string, subtitle: t.dash_leaderboard_sub as string, icon: Trophy, image: null, onClick: () => navigate("/leaderboard"), gradient: "from-amber-500/20 to-amber-500/5", notificationCount: 0 },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
            <Car className="h-4.5 w-4.5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t.app_name as string}</h1>
        </div>
        <div className="flex items-center gap-0.5 relative" ref={profileMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
            onClick={() => setProfileMenuOpen((o) => !o)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="true"
          >
            <User className="h-5 w-5" />
          </Button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-xl border border-border bg-card shadow-lg z-50">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-secondary/50 flex items-center gap-2 rounded-t-xl"
                  onClick={() => { setProfileMenuOpen(false); navigate("/profile"); }}
                >
                  <User className="h-4 w-4" />
                  {t.dash_my_profile as string}
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-secondary/50 flex items-center gap-2 rounded-b-xl"
                  onClick={() => { setProfileMenuOpen(false); navigate("/garage-settings"); }}
                >
                  <Car className="h-4 w-4" />
                  {t.dash_my_garage_settings as string}
                </button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={handleSignOut}><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="p-5 max-w-2xl mx-auto relative z-10">
        <h2 className="text-base font-medium text-muted-foreground mb-5">{t.dash_hey as string} <span className="text-foreground font-semibold">{displayName}</span> 👋</h2>

        {/* Row 1: Mon Garage + Zone de Jeu */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {topTiles.map((tile) => (
            <button
              key={tile.title}
              onClick={tile.onClick}
              className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20 w-full"
            >
              <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
                {tile.iframe ? (
                  <div className="flex-1 overflow-hidden rounded-lg relative min-h-0">
                    <iframe
                      src={tile.iframe}
                      className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                      style={{ border: "none", objectFit: "cover", transform: "scale(1)", transformOrigin: "center center" }}
                      loading="lazy"
                      title={tile.title}
                    />
                  </div>
                ) : tile.image ? (
                  <>
                    <div className="flex-1 overflow-hidden rounded-lg mb-2 relative">
                      <img src={tile.image} alt="Latest spot" className="h-full w-full object-cover rounded-lg" loading="lazy" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 rounded-b-lg">
                        <h3 className="font-bold text-xs leading-tight">{tile.title}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tile.subtitle}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`flex flex-1 items-center justify-center bg-gradient-to-br ${tile.gradient} rounded-lg`}>
                      <tile.icon className="h-11 w-11 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                    </div>
                    <div className="mt-2">
                      <h3 className="font-bold text-sm leading-tight">{tile.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tile.subtitle}</p>
                    </div>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Row 2: Garages d'Amis + Magasin */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {bottomTiles.map((tile) => (
            <button
              key={tile.title}
              onClick={tile.onClick}
              className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20"
            >
              <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
                 {tile.title === (t.dash_friends as string) && currentFriendSpot ? (
                  <>
                    <div className="flex-1 overflow-hidden rounded-lg relative min-h-0">
                      {currentFriendSpot.image_url ? (
                        <img
                          key={currentFriendSpot.id}
                          src={currentFriendSpot.image_url}
                          alt={`${currentFriendSpot.brand} ${currentFriendSpot.model}`}
                          className="h-full w-full object-cover rounded-lg transition-opacity duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full rounded-lg bg-secondary/50 flex items-center justify-center">
                          <Car className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                      )}
                      {friendNotificationCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 shadow-lg">
                          {friendNotificationCount > 99 ? "99+" : friendNotificationCount}
                        </span>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 rounded-b-lg">
                        <h3 className="font-bold text-xs leading-tight">{t.dash_friends as string}</h3>
                        {currentFriendSpot.username && (
                          <p className="text-[10px] text-muted-foreground truncate">by {currentFriendSpot.username}</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                     <div className={`flex flex-1 items-center justify-center bg-gradient-to-br ${tile.gradient} rounded-lg relative`}>
                      {tile.title === (t.dash_friends as string) && tile.notificationCount > 0 ? (
                        <>
                          <Users className="h-11 w-11 text-primary/80 group-hover:text-primary transition-colors" />
                          <span className="absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 shadow-lg">
                            {tile.notificationCount > 99 ? "99+" : tile.notificationCount}
                          </span>
                        </>
                      ) : (
                        <tile.icon className="h-11 w-11 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                      )}
                    </div>
                    <div className="mt-2">
                      <h3 className="font-bold text-sm leading-tight">{tile.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tile.subtitle}</p>
                    </div>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* AutoSpotter + Leaderboard — tuiles réduites (~1/3 hauteur) */}
        <div className="grid grid-cols-2 gap-3">
          {smallTiles.map((tile) => (
            <button
              key={tile.title}
              onClick={tile.onClick}
              className="relative group overflow-hidden rounded-xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] h-20 shadow-lg shadow-black/20"
            >
              <div className={`flex h-full w-full flex-row items-center gap-3 rounded-lg bg-card/90 p-3 bg-gradient-to-r ${tile.gradient}`}>
                <tile.icon className="h-8 w-8 shrink-0 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm leading-tight truncate">{tile.title}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{tile.subtitle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate("/map", { state: { mapCenter } })}
          className="mt-3 w-full rounded-2xl border border-border/60 overflow-hidden bg-card/80 text-left transition-all hover:scale-[1.01] hover:border-primary/40 active:scale-[0.99] shadow-lg shadow-black/20"
        >
          <div className="h-40 relative">
            <Suspense fallback={<div className="h-full w-full bg-secondary/20 animate-pulse" />}>
              <DashboardMap spots={mapSpots} center={mapCenter} />
            </Suspense>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm text-white">{t.dash_spot_map as string}</span>
              <span className="text-xs text-white/60">• {mapSpots.length} {t.dash_located as string}</span>
            </div>
          </div>
        </button>
      </main>
    </div>
  );
};

export default Dashboard;
