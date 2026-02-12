import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ItalianFlagBg from "@/components/ItalianFlagBg";
import GarageSortSelect, { type GarageSortOption } from "@/components/GarageSortSelect";

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
  car_meet: boolean;
  image_url: string | null;
  created_at: string;
}

const MyGarage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cars, setCars] = useState<SpottedCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<GarageSortOption>("newest");

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

  useEffect(() => {
    if (!user) return;
    const fetchCars = async () => {
      const { data } = await supabase
        .from("cars")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setCars((data as SpottedCar[]) || []);
      setLoading(false);
    };
    fetchCars();
  }, [user]);

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
      <ItalianFlagBg />
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">My Garage</h1>
        <div className="ml-auto flex items-center gap-2">
          <GarageSortSelect value={sortOption} onChange={setSortOption} />
          <span className="text-sm text-muted-foreground">{cars.length} spots</span>
        </div>
      </header>

      {/* Car List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-muted-foreground">Loading your garage...</div>
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
                    />
                  </div>
                ) : (
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src={`https://source.unsplash.com/800x600/?${encodeURIComponent(car.brand + " " + car.model + " car")}`}
                      alt={`${car.brand} ${car.model}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.classList.add("bg-secondary/30", "flex", "items-center", "justify-center");
                      }}
                    />
                    <div className="absolute bottom-2 right-2 rounded-full bg-background/70 backdrop-blur px-2 py-0.5 text-[10px] text-muted-foreground">
                      Auto image
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-bold text-lg">
                      {car.brand} {car.model}
                    </h3>
                    <span className="text-sm text-muted-foreground">{car.year}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {getBadges(car).map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Car Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={() => navigate("/add-car")}
          className="w-full h-12 text-base font-bold rounded-xl gap-2"
        >
          <Plus className="h-5 w-5" />
          Add a Car
        </Button>
      </div>
    </div>
  );
};

export default MyGarage;
