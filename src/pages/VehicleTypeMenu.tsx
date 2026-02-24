import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Truck, Bike, Ship, Plane, TrainFront, Sparkles } from "lucide-react";
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

const VehicleTypeMenu = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: counts = {} } = useQuery({
    queryKey: ["vehicle-type-counts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("vehicle_type")
        .eq("user_id", user!.id);
      const map: Record<string, number> = {};
      for (const row of data || []) {
        const vt = (row as any).vehicle_type || "car";
        map[vt] = (map[vt] || 0) + 1;
      }
      return map;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

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

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          {VEHICLE_TYPES.map(({ key, icon: Icon, gradient }) => {
            const count = counts[key] || 0;
            return (
              <button
                key={key}
                onClick={() => navigate(`/garage?type=${key}`)}
                className="relative group overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-1 text-left transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] aspect-square shadow-lg shadow-black/20"
              >
                <div className="flex h-full w-full flex-col justify-between rounded-xl bg-card/90 p-4">
                  <div className={`flex flex-1 items-center justify-center bg-gradient-to-br ${gradient} rounded-lg`}>
                    <Icon className="h-12 w-12 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                  </div>
                  <div className="mt-3">
                    <h3 className="font-bold text-sm leading-tight">{t[LABEL_KEYS[key]] as string}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {count} spot{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default VehicleTypeMenu;
