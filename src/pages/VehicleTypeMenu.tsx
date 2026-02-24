import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Truck, Bike, Ship, Plane, TrainFront, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface SpotRow {
  id: string;
  image_url: string | null;
  vehicle_type: string;
  created_at: string;
  brand?: string;
  model?: string;
  year?: number;
}

const VehicleTypeMenu = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pinSearch, setPinSearch] = useState("");

  const { data: spotsData } = useQuery({
    queryKey: ["vehicle-type-menu", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("id, image_url, vehicle_type, created_at, brand, model, year")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as SpotRow[]) || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const { counts, latestByType, allSpots } = useMemo(() => {
    const counts: Record<string, number> = {};
    const latestByType: Record<string, { id: string; image_url: string | null }> = {};
    const spots = spotsData || [];
    for (const row of spots) {
      const vt = row.vehicle_type || "car";
      counts[vt] = (counts[vt] || 0) + 1;
      if (!latestByType[vt]) latestByType[vt] = { id: row.id, image_url: row.image_url };
    }
    return { counts, latestByType, allSpots: spots };
  }, [spotsData]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const latestAll = allSpots[0] ?? null;

  const pinSearchLower = pinSearch.trim().toLowerCase();
  const filteredForPin = useMemo(() => {
    if (!pinSearchLower) return allSpots.slice(0, 8);
    return allSpots.filter(
      (c) =>
        `${c.brand || ""} ${c.model || ""}`.toLowerCase().includes(pinSearchLower) ||
        String(c.year || "").includes(pinSearchLower)
    ).slice(0, 8);
  }, [allSpots, pinSearchLower]);

  const handleSetPinned = async (carId: string) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ pinned_car_id: carId }).eq("user_id", user.id);
    if (!error) {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate flex-1">{t.garage_title as string}</h1>
        <span className="text-sm text-muted-foreground">{total} spots</span>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Tuiles par type : dernier spot affiché */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tous */}
          <button
            onClick={() => navigate("/garage")}
            className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20"
          >
            <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
              {latestAll?.image_url ? (
                <>
                  <div className="flex-1 overflow-hidden rounded-lg mb-2 relative">
                    <img src={latestAll.image_url} alt="" className="h-full w-full object-cover rounded-lg" loading="lazy" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                      <h3 className="font-bold text-xs leading-tight">{t.garage_menu_all as string}</h3>
                      <p className="text-[10px] text-muted-foreground">{total} spots</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg">
                    <Car className="h-11 w-11 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
                  </div>
                  <div className="mt-2">
                    <h3 className="font-bold text-sm leading-tight">{t.garage_menu_all as string}</h3>
                    <p className="text-[10px] text-muted-foreground">{total} spot{total !== 1 ? "s" : ""}</p>
                  </div>
                </>
              )}
            </div>
          </button>

          {VEHICLE_TYPES.filter((v) => v.key !== "hot_wheels").map(({ key, icon: Icon, gradient }) => {
            const count = counts[key] || 0;
            const latest = latestByType[key];
            return (
              <button
                key={key}
                onClick={() => navigate(`/garage?type=${key}`)}
                className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20"
              >
                <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-3">
                  {latest?.image_url ? (
                    <>
                      <div className="flex-1 overflow-hidden rounded-lg mb-2 relative">
                        <img src={latest.image_url} alt="" className="h-full w-full object-cover rounded-lg" loading="lazy" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                          <h3 className="font-bold text-xs leading-tight">{t[LABEL_KEYS[key]] as string}</h3>
                          <p className="text-[10px] text-muted-foreground">{count} spot{count !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`flex flex-1 items-center justify-center bg-gradient-to-br ${gradient} rounded-lg`}>
                        <Icon className="h-11 w-11 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                      </div>
                      <div className="mt-2">
                        <h3 className="font-bold text-sm leading-tight">{t[LABEL_KEYS[key]] as string}</h3>
                        <p className="text-[10px] text-muted-foreground">{count} spot{count !== 1 ? "s" : ""}</p>
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}

          {/* Hot Wheels : largeur 2 cols, hauteur réduite */}
          <button
            onClick={() => navigate("/garage?type=hot_wheels")}
            className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] col-span-2 h-20 shadow-lg shadow-black/20"
          >
            <div className="flex h-full w-full flex-row items-center gap-3 rounded-xl bg-card/90 p-3 bg-gradient-to-r from-rose-500/20 to-rose-500/5">
              {latestByType.hot_wheels?.image_url ? (
                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden">
                  <img src={latestByType.hot_wheels.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-14 h-14 shrink-0 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-muted-foreground/50" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm leading-tight">{t.garage_menu_hot_wheels as string}</h3>
                <p className="text-[10px] text-muted-foreground">{counts.hot_wheels || 0} spot{(counts.hot_wheels || 0) !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Barre de recherche : spot à afficher sur la tuile principale */}
        <section className="rounded-xl border border-border/60 bg-card/80 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            {t.garage_menu_pin_search_title as string}
          </p>
          <Input
            placeholder={t.settings_pinned_search_placeholder as string}
            value={pinSearch}
            onChange={(e) => setPinSearch(e.target.value)}
            className="bg-secondary/30"
          />
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredForPin.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleSetPinned(spot.id)}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/90 p-2 hover:border-primary/40 transition-colors text-left min-w-0"
              >
                {spot.image_url ? (
                  <img src={spot.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-secondary/50 flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
                <span className="text-xs font-medium truncate max-w-[120px]">{spot.brand} {spot.model} {spot.year}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default VehicleTypeMenu;
