import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTheme, THEMES, PAID_STYLES, type ThemeId } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Check, ChevronLeft, Lock, Palette, Pin, Search, Truck, Bike, Ship, Plane, TrainFront, Sparkles, Coins } from "lucide-react";
import { SignedMediaImg } from "@/components/SignedMediaImg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import BlackGoldBg from "@/components/BlackGoldBg";

interface CarOption {
  id: string;
  brand: string;
  model: string;
  year: number;
  image_url: string | null;
  created_at: string;
  vehicle_type: string;
}

const PIN_VEHICLE_TYPES = [
  { key: "car", icon: Car, gradient: "from-primary/20 to-primary/5", labelKey: "garage_menu_cars" },
  { key: "truck", icon: Truck, gradient: "from-blue-500/20 to-blue-500/5", labelKey: "garage_menu_trucks" },
  { key: "motorcycle", icon: Bike, gradient: "from-emerald-500/20 to-emerald-500/5", labelKey: "garage_menu_motorcycles" },
  { key: "boat", icon: Ship, gradient: "from-cyan-500/20 to-cyan-500/5", labelKey: "garage_menu_boats" },
  { key: "plane", icon: Plane, gradient: "from-violet-500/20 to-violet-500/5", labelKey: "garage_menu_planes" },
  { key: "train", icon: TrainFront, gradient: "from-amber-500/20 to-amber-500/5", labelKey: "garage_menu_trains" },
  { key: "hot_wheels", icon: Sparkles, gradient: "from-rose-500/20 to-rose-500/5", labelKey: "garage_menu_hot_wheels" },
] as const;

const GarageSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { theme, setTheme, ownedStyleIds, coins, refetchOwned } = useTheme();
  const [pinnedCarId, setPinnedCarId] = useState<string | null>(null);
  const [unlockingStyleId, setUnlockingStyleId] = useState<string | null>(null);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
  const [pinDialogTypeFilter, setPinDialogTypeFilter] = useState<string | null>(null);
  const [spotSearchQuery, setSpotSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: profile } = await (supabase
          .from("profiles")
          .select("pinned_car_id")
          .eq("user_id", user.id)
          .maybeSingle() as any);
        if (profile?.pinned_car_id) setPinnedCarId(profile.pinned_car_id);

        const { data: carsData } = await supabase
          .from("cars")
          .select("id, brand, model, year, image_url, created_at, vehicle_type")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setCars((carsData as CarOption[]) || []);
      } catch {
        toast.error("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSavePinned = async (carId: string | null) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ pinned_car_id: carId })
        .eq("user_id", user.id);
      if (error) throw error;
      setPinnedCarId(carId);
      setChoiceDialogOpen(false);
      setPinDialogTypeFilter(null);
      setSpotSearchQuery("");
      await queryClient.invalidateQueries({ queryKey: ["profile-pinned-self", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["my-pinned-car"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(carId ? (t.settings_pinned_updated as string) : (t.settings_pinned_removed as string));
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const spotSearchLower = spotSearchQuery.trim().toLowerCase();
  const filteredCarsForChoice = useMemo(() => {
    let list = cars;
    if (pinDialogTypeFilter) {
      list = list.filter((c) => (c.vehicle_type || "car") === pinDialogTypeFilter);
    }
    if (!spotSearchLower) return list;
    return list.filter(
      (c) =>
        `${c.brand} ${c.model}`.toLowerCase().includes(spotSearchLower) ||
        String(c.year).includes(spotSearchLower)
    );
  }, [cars, spotSearchLower, pinDialogTypeFilter]);

  const onChoiceDialogOpenChange = (open: boolean) => {
    if (!open) {
      setPinDialogTypeFilter(null);
      setSpotSearchQuery("");
    }
    setChoiceDialogOpen(open);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.settings_title as string}</h1>
      </header>

      <div className="relative z-10 p-6 max-w-md mx-auto space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            {t.settings_theme as string}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                  theme === t.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-lg border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${t.preview.bg} 0%, ${t.preview.accent} 100%)`,
                  }}
                />
                <span className="text-sm font-semibold">{t.label}</span>
                {theme === t.id && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground pt-2">{t.settings_paid_styles as string}</h3>
          <div className="grid grid-cols-2 gap-3">
            {PAID_STYLES.map((s) => {
              const owned = ownedStyleIds.has(s.id);
              const price = s.price ?? 0;
              const canUnlock = coins >= price;
              const unlocking = unlockingStyleId === s.id;
              return (
                <div
                  key={s.id}
                  className={`relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                    theme === s.id ? "border-primary bg-primary/10" : "border-border bg-card"
                  } ${owned ? "" : "opacity-90"}`}
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${s.preview.bg} 0%, ${s.preview.accent} 100%)`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold block">{s.label}</span>
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => setTheme(s.id)}
                        className="text-xs text-primary hover:underline mt-0.5"
                      >
                        {theme === s.id ? "✓ Actif" : (t.settings_theme_apply as string)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={unlocking || !canUnlock}
                        onClick={async () => {
                          setUnlockingStyleId(s.id);
                          try {
                            const { error } = await supabase.rpc("unlock_style", { p_style_id: s.id, p_price: price });
                            if (error) throw error;
                            await refetchOwned();
                            setTheme(s.id);
                            toast.success(t.settings_style_unlocked as string);
                          } catch (err: any) {
                            toast.error(err?.message ?? (t.error as string));
                          } finally {
                            setUnlockingStyleId(null);
                          }
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5 disabled:opacity-50"
                      >
                        {unlocking ? "…" : (
                          <>
                            <Lock className="h-3 w-3" />
                            <Coins className="h-3 w-3" />
                            {price}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {theme === s.id && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Pin className="h-5 w-5 text-primary" />
            {t.settings_pinned as string}
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.loading as string}</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleSavePinned(null)}
                disabled={saving}
                className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  !pinnedCarId ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                  <Car className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{t.settings_pinned_default as string}</p>
                  <p className="text-xs text-muted-foreground">{t.settings_pinned_default_desc as string}</p>
                </div>
                {!pinnedCarId && <Check className="ml-auto h-4 w-4 text-primary shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => setChoiceDialogOpen(true)}
                disabled={saving}
                className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  pinnedCarId ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{t.settings_pinned_choice as string}</p>
                  <p className="text-xs text-muted-foreground">{t.settings_pinned_search as string}</p>
                </div>
                {pinnedCarId && <Check className="ml-auto h-4 w-4 text-primary shrink-0" />}
              </button>
            </div>
          )}

          <Dialog open={choiceDialogOpen} onOpenChange={onChoiceDialogOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {pinDialogTypeFilter ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 -ml-2"
                        onClick={() => { setPinDialogTypeFilter(null); setSpotSearchQuery(""); }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      {t[PIN_VEHICLE_TYPES.find((x) => x.key === pinDialogTypeFilter)?.labelKey ?? "garage_menu_cars"] as string}
                    </>
                  ) : (
                    t.settings_pinned_dialog as string
                  )}
                </DialogTitle>
              </DialogHeader>
              {!pinDialogTypeFilter ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PIN_VEHICLE_TYPES.map(({ key, icon: Icon, gradient, labelKey }) => {
                    const count = cars.filter((c) => (c.vehicle_type || "car") === key).length;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPinDialogTypeFilter(key)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-all border-border bg-gradient-to-br ${gradient} hover:border-primary/40`}
                      >
                        <Icon className="h-8 w-8 text-muted-foreground" />
                        <span className="text-xs font-medium text-center leading-tight">{t[labelKey] as string}</span>
                        <span className="text-[10px] text-muted-foreground">{count}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <Input
                    placeholder={t.settings_pinned_search_placeholder as string}
                    value={spotSearchQuery}
                    onChange={(e) => setSpotSearchQuery(e.target.value)}
                    className="bg-secondary/30"
                  />
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
                    {filteredCarsForChoice.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">{t.settings_pinned_none as string}</p>
                    ) : (
                      filteredCarsForChoice.map((car) => (
                        <button
                          key={car.id}
                          type="button"
                          onClick={() => handleSavePinned(car.id)}
                          disabled={saving}
                          className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                            pinnedCarId === car.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          {car.image_url ? (
                            <img
                              src={car.image_url}
                              alt={`${car.brand} ${car.model}`}
                              className="h-12 w-12 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                              <Car className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{car.brand} {car.model}</p>
                            <p className="text-xs text-muted-foreground">{car.year}</p>
                          </div>
                          {pinnedCarId === car.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </div>
  );
};

export default GarageSettings;
