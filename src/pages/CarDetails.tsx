import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ItalianFlagBg from "@/components/ItalianFlagBg";

interface CarDetail {
  id: string;
  brand: string;
  model: string;
  year: number;
  engine: string | null;
  seen_on_road: boolean;
  parked: boolean;
  stock: boolean;
  modified: boolean;
  car_meet: boolean;
  image_url: string | null;
  location_name: string | null;
  created_at: string;
}

const CarDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [car, setCar] = useState<CarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState<string | null>(null);
  const [loadingDesc, setLoadingDesc] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetchCar = async () => {
      const { data } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setCar(data as CarDetail | null);
      setLoading(false);
    };
    fetchCar();
  }, [user, id]);

  useEffect(() => {
    if (!car) return;
    const loadDescription = async () => {
      setLoadingDesc(true);
      try {
        const { data, error } = await supabase.functions.invoke("car-info", {
          body: { action: "description", brand: car.brand, model: car.model, year: car.year },
        });
        if (error) throw new Error((data as { error?: string })?.error || error.message);
        const text = (data as { description?: string })?.description;
        setDescription(text || `Aucune description pour la ${car.year} ${car.brand} ${car.model}.`);
      } catch (err: any) {
        console.error("car-info error:", err);
        setDescription(`Impossible de charger la description : ${err?.message || "erreur inconnue"}`);
      } finally {
        setLoadingDesc(false);
      }
    };
    loadDescription();
  }, [car]);

  const getBadges = (c: CarDetail) => {
    const badges: string[] = [];
    if (c.seen_on_road) badges.push("🛣️ Road");
    if (c.parked) badges.push("🅿️ Parked");
    if (c.stock) badges.push("Stock");
    if (c.modified) badges.push("🔧 Modified");
    if (c.car_meet) badges.push("🏁 Meet");
    return badges;
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
      <ItalianFlagBg />
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate">
          {car.brand} {car.model}
        </h1>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Image */}
        {car.image_url ? (
          <div className="w-full h-64 overflow-hidden">
            <img
              src={car.image_url}
              alt={`${car.brand} ${car.model}`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-secondary/20">
            <Car className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}

        <div className="p-4 space-y-5">
          {/* Title + Year */}
          <div>
            <h2 className="text-2xl font-bold">
              {car.brand} {car.model}
            </h2>
            <p className="text-muted-foreground">{car.year}</p>
          </div>

          {/* Engine */}
          {car.engine && (
            <div className="rounded-xl border border-border/50 bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Engine</p>
              <p className="font-medium">{car.engine}</p>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {getBadges(car).map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Location */}
          {car.location_name && (
            <p className="text-sm text-muted-foreground">📍 {car.location_name}</p>
          )}

          {/* Spotted date */}
          <p className="text-sm text-muted-foreground">
            Spotted on {new Date(car.created_at).toLocaleDateString()}
          </p>

          {/* AI Description */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              About this car
            </p>
            {loadingDesc ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading car info...
              </div>
            ) : description ? (
              <div className="text-sm leading-relaxed whitespace-pre-line">{description}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Could not load description.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetails;
