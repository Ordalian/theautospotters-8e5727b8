import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { callCarApi } from "@/lib/carApi";
import { ArrowLeft, Car, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import { RatingExplainer } from "@/components/RatingExplainer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CarDetail {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  edition: string | null;
  engine: string | null;
  finitions: string | null;
  seen_on_road: boolean;
  parked: boolean;
  stock: boolean;
  modified: boolean;
  modified_comment: string | null;
  car_meet: boolean;
  image_url: string | null;
  location_name: string | null;
  created_at: string;
  quality_rating: number | null;
  rarity_rating: number | null;
}

interface CarInfoResult {
  description: string;
  engines: { name: string; displacement: string; fuel: string; hp: number }[];
}

const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [photoPopupOpen, setPhotoPopupOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: car, isLoading: loading } = useQuery({
    queryKey: ["car", id],
    queryFn: async () => {
      const { data } = await (supabase
        .from("cars")
        .select("id, user_id, brand, model, year, edition, engine, finitions, seen_on_road, parked, stock, modified, modified_comment, car_meet, image_url, created_at, quality_rating, rarity_rating, car_condition, photo_source, latitude, longitude, location_name")
        .eq("id", id!)
        .maybeSingle() as any);
      return data as CarDetail | null;
    },
    enabled: !!user && !!id,
    staleTime: 10 * 60 * 1000,
  });

  const carKey = car ? `${car.brand}-${car.model}-${car.year}-${car.edition || ""}` : "";

  // Single combined call for description + engines
  const { data: carInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ["car-info", carKey],
    queryFn: async () => {
      return callCarApi<CarInfoResult>({
        action: "car-info",
        brand: car!.brand,
        model: car!.model,
        year: car!.year,
        ...(car!.edition ? { edition: car!.edition } : {}),
      });
    },
    enabled: !!car,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const description = carInfo?.description;
  const engines = carInfo?.engines ?? [];

  const getBadges = (c: CarDetail) => {
    const badges: string[] = [];
    if (c.seen_on_road) badges.push("🛣️ Road");
    if (c.parked) badges.push("🅿️ Parked");
    if (c.stock) badges.push("Stock");
    if (c.modified) badges.push("🔧 Modified");
    if (c.car_meet) badges.push("🏁 Meet");
    return badges;
  };

  const handleDelete = async () => {
    if (!car || !user || car.user_id !== user.id) return;
    if (!confirm("Supprimer ce spot ?")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("cars").delete().eq("id", car.id).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Spot supprimé");
      queryClient.invalidateQueries({ queryKey: ["my-cars", user.id] });
      navigate("/garage");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <Car className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">Car not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate flex-1">
          {car.brand} {car.model}
        </h1>
        {user && car.user_id === user.id && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Supprimer le spot"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </Button>
        )}
      </header>

      <div className="relative z-10 max-w-2xl mx-auto">
        {car.image_url ? (
          <button
            type="button"
            onClick={() => setPhotoPopupOpen(true)}
            className="w-full h-64 overflow-hidden block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary rounded-b-xl"
          >
            <img src={car.image_url} alt={`${car.brand} ${car.model}`} className="h-full w-full object-cover" loading="lazy" />
          </button>
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-secondary/20">
            <Car className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}

        <div className="p-4 space-y-5">
          <div>
            <h2 className="text-2xl font-bold">{car.brand} {car.model}</h2>
            <p className="text-muted-foreground">{car.year}</p>
            {car.edition?.trim() && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Série : <span className="font-medium text-foreground">{car.edition}</span>
              </p>
            )}
            {car.finitions?.trim() && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Finitions : <span className="font-medium text-foreground">{car.finitions}</span>
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <RatingExplainer rarityLevel={car.rarity_rating ?? 5} qualityLevel={car.quality_rating ?? 3} size="md" />
            </div>
          </div>

          {car.modified && car.modified_comment?.trim() && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Modifications</p>
              <p className="text-sm leading-relaxed">{car.modified_comment}</p>
            </div>
          )}

          {car.engine && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Engine</p>
              <p className="font-medium">{car.engine}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {getBadges(car).map((badge) => (
              <span key={badge} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{badge}</span>
            ))}
          </div>

          {car.location_name && <p className="text-sm text-muted-foreground">📍 {car.location_name}</p>}
          <p className="text-sm text-muted-foreground">Spotted on {new Date(car.created_at).toLocaleDateString()}</p>

          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">À propos de ce modèle</p>
            {loadingInfo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
              </div>
            ) : description ? (
              <div className="text-sm leading-relaxed text-pretty whitespace-pre-line">{description}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Impossible de charger la description.</p>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moteurs (ce modèle)</p>
            {loadingInfo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
              </div>
            ) : engines.length > 0 ? (
              <ul className="space-y-2">
                {engines.map((eng, i) => (
                  <li key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                    <span className="font-medium">{eng.name}</span>
                    <span className="text-muted-foreground">{eng.hp} ch • {eng.fuel}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun moteur trouvé pour ce modèle.</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={photoPopupOpen} onOpenChange={setPhotoPopupOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 overflow-hidden bg-black/95 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{car.brand} {car.model} – photo</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setPhotoPopupOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={car.image_url!}
            alt={`${car.brand} ${car.model}`}
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain mx-auto"
            onClick={(e) => e.stopPropagation()}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarDetails;
