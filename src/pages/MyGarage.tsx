import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import BlackGoldBg from "@/components/BlackGoldBg";
import GarageSortSelect, { type GarageSortOption } from "@/components/GarageSortSelect";
import { RatingExplainer } from "@/components/RatingExplainer";
import { useQuery } from "@tanstack/react-query";

interface SpottedCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  engine: string | null;
  seen_on_road: boolean;
  parked: boolean;
  stock: boolean;
  modified: boolean;
  modified_comment: string | null;
  car_meet: boolean;
  image_url: string | null;
  created_at: string;
  quality_rating: number | null;
  rarity_rating: number | null;
}

const MyGarage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sortOption, setSortOption] = useState<GarageSortOption>("newest");

  const { data: cars = [], isLoading: loading } = useQuery({
    queryKey: ["my-cars", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as unknown as SpottedCar[]) || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const sortedCars = useMemo(() => {
    const sorted = [...cars];
    switch (sortOption) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "brand":
        return sorted.sort((a, b) => a.brand.localeCompare(b.brand));
      default:
        return sorted;
    }
  }, [cars, sortOption]);

  const getBadges = (car: SpottedCar) => {
    const badges: string[] = [];
    if (car.seen_on_road) badges.push("🛣️ Road");
    if (car.parked) badges.push("🅿️ Parked");
    if (car.stock) badges.push("Stock");
    if (car.modified) badges.push("🔧 Modified");
    if (car.car_meet) badges.push("🏁 Meet");
    return badges;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">My Garage</h1>
        <div className="ml-auto flex items-center gap-2">
          <GarageSortSelect value={sortOption} onChange={setSortOption} />
          <span className="text-sm text-muted-foreground">{cars.length} spots</span>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : cars.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Car className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">No cars yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Start spotting and add your first car!</p>
            </div>
          ) : (
            sortedCars.map((car) => (
              <div
                key={car.id}
                onClick={() => navigate(`/car/${car.id}`)}
                className="rounded-xl border border-border/50 bg-card overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
              >
                {car.image_url ? (
                  <div className="h-44 overflow-hidden">
                    <img
                      src={car.image_url}
                      alt={`${car.brand} ${car.model}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-44 overflow-hidden bg-secondary/20 flex items-center justify-center">
                    <Car className="h-16 w-16 text-muted-foreground/20" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold text-lg">{car.brand} {car.model}</h3>
                    <span className="text-sm text-muted-foreground shrink-0">{car.year}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <RatingExplainer rarityLevel={car.rarity_rating ?? 5} qualityLevel={car.quality_rating ?? 3} size="sm" />
                  </div>
                  {car.modified && car.modified_comment?.trim() && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 border-l-2 border-primary/30 pl-2">
                      {car.modified_comment}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {getBadges(car).map((badge) => (
                      <span key={badge} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{badge}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button onClick={() => navigate("/add-car")} className="w-full h-12 text-base font-bold rounded-xl gap-2">
          <Plus className="h-5 w-5" /> Add a Car
        </Button>
      </div>
    </div>
  );
};

export default MyGarage;
