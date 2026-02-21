import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTheme, THEMES, type ThemeId } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Check, Palette, Pin, Search } from "lucide-react";
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
}

const GarageSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [pinnedCarId, setPinnedCarId] = useState<string | null>(null);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
  const [spotSearchQuery, setSpotSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await (supabase
        .from("profiles")
        .select("pinned_car_id")
        .eq("user_id", user.id)
        .maybeSingle() as any);
      if (profile?.pinned_car_id) setPinnedCarId(profile.pinned_car_id);

      const { data: carsData } = await supabase
        .from("cars")
        .select("id, brand, model, year, image_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setCars((carsData as CarOption[]) || []);
      setLoading(false);
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
      setSpotSearchQuery("");
      toast.success(carId ? (t.settings_pinned_updated as string) : (t.settings_pinned_removed as string));
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const spotSearchLower = spotSearchQuery.trim().toLowerCase();
  const filteredCarsForChoice = useMemo(() => {
    if (!spotSearchLower) return cars;
    return cars.filter(
      (c) =>
        `${c.brand} ${c.model}`.toLowerCase().includes(spotSearchLower) ||
        String(c.year).includes(spotSearchLower)
    );
  }, [cars, spotSearchLower]);

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
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

          <Dialog open={choiceDialogOpen} onOpenChange={setChoiceDialogOpen}>
            <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{t.settings_pinned_dialog as string}</DialogTitle>
              </DialogHeader>
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
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </div>
  );
};

export default GarageSettings;
