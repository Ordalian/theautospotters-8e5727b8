import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Truck, Bike, Ship, Plane, TrainFront, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import { useQuery } from "@tanstack/react-query";

const VEHICLE_TYPES = [
  { key: "car", icon: Car, gradient: "from-primary/20 to-primary/5" },
  { key: "truck", icon: Truck, gradient: "from-blue-500/20 to-blue-500/5" },
  { key: "motorcycle", icon: Bike, gradient: "from-emerald-500/20 to-emerald-500/5" },
  { key: "boat", icon: Ship, gradient: "from-cyan-500/20 to-cyan-500/5" },
  { key: "plane", icon: Plane, gradient: "from-violet-500/20 to-violet-500/5" },
  { key: "train", icon: TrainFront, gradient: "from-amber-500/20 to-amber-500/5" },
  { key: "hot_wheels", icon: Sparkles, gradient: "from-rose-500/20 to-rose-500/5" },
] as const;

type VehicleTypeKey = (typeof VEHICLE_TYPES)[number]["key"];

const LABEL_KEYS: Record<VehicleTypeKey, string> = {
  car: "garage_menu_cars",
  truck: "garage_menu_trucks",
  motorcycle: "garage_menu_motorcycles",
  boat: "garage_menu_boats",
  plane: "garage_menu_planes",
  train: "garage_menu_trains",
  hot_wheels: "garage_menu_hot_wheels",
};

interface FriendCarRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  image_url: string | null;
  vehicle_type: string;
  created_at: string;
}

const FriendGarage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get("type");

  const { data: isFriend = false, isLoading: loadingFriend } = useQuery({
    queryKey: ["is-friend", user?.id, friendId],
    queryFn: async () => {
      if (!user?.id || !friendId) return false;
      const { data } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id && !!friendId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: friendProfile } = useQuery({
    queryKey: ["profile-username", friendId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username").eq("user_id", friendId!).maybeSingle();
      return data?.username ?? null;
    },
    enabled: !!friendId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: typesData = { counts: {}, images: {}, latestAllImage: null }, isLoading: typesLoading } = useQuery({
    queryKey: ["friend-vehicle-type-counts", friendId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("vehicle_type, image_url, created_at")
        .eq("user_id", friendId!)
        .order("created_at", { ascending: false });
      const counts: Record<string, number> = {};
      const images: Record<string, string> = {};
      let latestAllImage: string | null = null;
      for (const row of data || []) {
        const vt = (row as { vehicle_type?: string }).vehicle_type || "car";
        counts[vt] = (counts[vt] || 0) + 1;
        if (!images[vt] && (row as { image_url?: string }).image_url) {
          images[vt] = (row as { image_url: string }).image_url;
        }
        if (vt !== "hot_wheels" && !latestAllImage && (row as { image_url?: string }).image_url) {
          latestAllImage = (row as { image_url: string }).image_url;
        }
      }
      return { counts, images, latestAllImage };
    },
    enabled: !!friendId && isFriend,
    staleTime: 2 * 60 * 1000,
  });

  const { data: friendCars = [], isLoading: carsLoading, error: friendCarsError } = useQuery({
    queryKey: ["friend-cars", friendId, typeFilter],
    queryFn: async () => {
      const q = supabase
        .from("cars")
        .select("id, brand, model, year, image_url, vehicle_type, created_at")
        .eq("user_id", friendId!) as any;
      const q2 = typeFilter && typeFilter !== "all" ? q.eq("vehicle_type", typeFilter) : q.neq("vehicle_type", "hot_wheels");
      const { data, error } = await q2.order("created_at", { ascending: false });
      if (error) throw error;
      return (data as FriendCarRow[] | null) ?? [];
    },
    enabled: !!friendId && isFriend && !!typeFilter,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!!friendId && !loadingFriend && !isFriend) {
      navigate("/friends", { replace: true });
    }
  }, [friendId, loadingFriend, isFriend, navigate]);

  const counts = typesData.counts;
  const images = typesData.images;
  const latestAllImage = typesData.latestAllImage ?? null;
  const total = Object.entries(counts).reduce((sum, [k, v]) => sum + (k === "hot_wheels" ? 0 : v), 0);
  const displayName = friendProfile ?? (t.friends_this_friend as string);
  const returnTo = `/friends/${friendId}/garage${typeFilter ? `?type=${typeFilter}` : ""}`;

  if (loadingFriend || !isFriend) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (typeFilter) {
    const listTitle = typeFilter === "all" ? (t.garage_menu_all as string) : (t[LABEL_KEYS[typeFilter as VehicleTypeKey] as keyof typeof t] as string);
    return (
      <div className="flex min-h-screen flex-col bg-background relative">
        <BlackGoldBg />
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/friends/${friendId}/garage`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold truncate flex-1">
            {(t.friends_garage_of as (name: string) => string)(displayName)} · {listTitle}
          </h1>
        </header>
        <main className="flex-1 min-h-0 flex flex-col p-4 max-w-lg mx-auto w-full">
          {carsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : friendCarsError ? (
            <p className="text-destructive text-sm text-center py-8">{t.friends_garage_load_error as string}</p>
          ) : friendCars.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">{t.friends_garage_no_vehicle_in_category as string}</p>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
            {friendCars.map((car) => (
              <button
                key={car.id}
                type="button"
                onClick={() => navigate(`/car/${car.id}`, { state: { carIds: friendCars.map((c) => c.id), returnTo: `/friends/${friendId}/stats` } })}
                className="w-full rounded-xl border border-border bg-card overflow-hidden text-left hover:border-primary/30 transition-colors"
              >
                {car.image_url ? (
                  <img src={car.image_url} alt={`${car.brand} ${car.model}`} className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-muted">
                    <Car className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-bold">{car.brand} {car.model}</p>
                  <p className="text-sm text-muted-foreground">{car.year}</p>
                </div>
              </button>
            ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  if (typesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/friends/${friendId}/stats`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate flex-1">{(t.friends_garage_of as (name: string) => string)(displayName)}</h1>
        <span className="text-sm text-muted-foreground">{total} spots</span>
      </header>

      <main className="flex-1 flex flex-col min-h-0 p-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 grid-rows-4 gap-3 flex-1 min-h-0">
          <button
            onClick={() => navigate(`/friends/${friendId}/garage?type=all`)}
            className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] min-h-0 shadow-lg shadow-black/20"
          >
            {latestAllImage ? (
              <>
                <img src={latestAllImage} alt="" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-2xl" />
                <div className="relative flex h-full w-full flex-col justify-end p-4">
                  <h3 className="font-bold text-sm leading-tight text-white drop-shadow-md">{t.garage_menu_all as string}</h3>
                  <p className="text-[10px] text-white/70 mt-0.5">{total} spot{total !== 1 ? "s" : ""}</p>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-4">
                <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg">
                  <Car className="h-12 w-12 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </div>
                <div className="mt-3">
                  <h3 className="font-bold text-sm leading-tight">{t.garage_menu_all as string}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{total} spot{total !== 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
          </button>

          {VEHICLE_TYPES.map(({ key, icon: Icon, gradient }) => {
            const count = counts[key] || 0;
            const img = images[key];
            return (
              <button
                key={key}
                onClick={() => navigate(`/friends/${friendId}/garage?type=${key}`)}
                className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] min-h-0 shadow-lg shadow-black/20"
              >
                {img ? (
                  <>
                    <img src={img} alt={t[LABEL_KEYS[key]] as string} className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-2xl" />
                    <div className="relative flex h-full w-full flex-col justify-end p-4">
                      <h3 className="font-bold text-sm leading-tight text-white drop-shadow-md">{t[LABEL_KEYS[key]] as string}</h3>
                      <p className="text-[10px] text-white/70 mt-0.5">{count} spot{count !== 1 ? "s" : ""}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-4">
                    <div className={`flex flex-1 items-center justify-center bg-gradient-to-br ${gradient} rounded-lg`}>
                      <Icon className="h-12 w-12 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                    </div>
                    <div className="mt-3">
                      <h3 className="font-bold text-sm leading-tight">{t[LABEL_KEYS[key]] as string}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{count} spot{count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default FriendGarage;
