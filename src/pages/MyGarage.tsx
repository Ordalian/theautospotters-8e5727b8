import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Car, Loader2, Trash2, FolderPlus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import BlackGoldBg from "@/components/BlackGoldBg";
import GarageSortSelect, { type GarageSortOption } from "@/components/GarageSortSelect";
import { RatingExplainer } from "@/components/RatingExplainer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  garage_group_id: string | null;
}

interface GarageGroup {
  id: string;
  name: string;
  sort_order: number;
}

const MyGarage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [sortOption, setSortOption] = useState<GarageSortOption>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const brandFilter = searchParams.get("brand") ?? null;
  const groupFilter = searchParams.get("group") ?? null;

  const handleDelete = async (e: React.MouseEvent, carId: string) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce spot ?")) return;
    setDeletingId(carId);
    try {
      const { error } = await supabase.from("cars").delete().eq("id", carId).eq("user_id", user!.id);
      if (error) throw error;
      toast.success("Spot supprimé");
      queryClient.invalidateQueries({ queryKey: ["my-cars", user?.id] });
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const { data: cars = [], isLoading: loading } = useQuery({
    queryKey: ["my-cars", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("id, brand, model, year, engine, seen_on_road, parked, stock, modified, modified_comment, car_meet, image_url, created_at, quality_rating, rarity_rating, garage_group_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as SpottedCar[]) || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["garage-groups", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("garage_groups")
        .select("id, name, sort_order")
        .eq("user_id", user!.id)
        .order("sort_order", { ascending: true })
        .order("name");
      return (data as GarageGroup[]) ?? [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const sortedCars = useMemo(() => {
    let list = brandFilter
      ? cars.filter((c) => c.brand === brandFilter)
      : groupFilter
        ? groupFilter === "none"
          ? cars.filter((c) => !c.garage_group_id)
          : cars.filter((c) => c.garage_group_id === groupFilter)
        : [...cars];
    switch (sortOption) {
      case "newest":
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "brand":
        return list.sort((a, b) => a.brand.localeCompare(b.brand));
      default:
        return list;
    }
  }, [cars, sortOption, brandFilter, groupFilter]);

  const carsByBrand = useMemo(() => {
    const map = new Map<string, SpottedCar[]>();
    for (const car of cars) {
      const list = map.get(car.brand) ?? [];
      list.push(car);
      map.set(car.brand, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [cars]);

  const carsByGroup = useMemo(() => {
    const result: { id: string; name: string; cars: SpottedCar[] }[] = [];
    const groupMap = new Map<string, GarageGroup>();
    for (const g of groups) groupMap.set(g.id, g);
    const noGroupCars = cars.filter((c) => !c.garage_group_id);
    if (noGroupCars.length > 0) {
      result.push({ id: "none", name: "Sans groupe", cars: noGroupCars.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) });
    }
    for (const g of groups) {
      const groupCars = cars.filter((c) => c.garage_group_id === g.id);
      if (groupCars.length > 0) {
        result.push({
          id: g.id,
          name: g.name,
          cars: groupCars.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        });
      }
    }
    return result;
  }, [cars, groups]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;
    setCreatingGroup(true);
    try {
      const { error } = await supabase.from("garage_groups").insert({
        user_id: user.id,
        name: newGroupName.trim(),
        sort_order: groups.length,
      });
      if (error) throw error;
      toast.success("Groupe créé");
      setNewGroupName("");
      setShowNewGroupDialog(false);
      queryClient.invalidateQueries({ queryKey: ["garage-groups", user.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAssignGroup = async (carId: string, groupId: string | null) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("cars")
        .update({ garage_group_id: groupId })
        .eq("id", carId)
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-cars", user.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

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
        <Button variant="ghost" size="icon" onClick={() => (brandFilter || groupFilter) ? setSearchParams({}) : navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold truncate flex-1">
          {brandFilter ? brandFilter : groupFilter ? (groups.find((g) => g.id === groupFilter)?.name ?? (groupFilter === "none" ? "Sans groupe" : "Groupe")) : "Mon Garage"}
        </h1>
        <div className="flex items-center gap-2">
          <GarageSortSelect value={sortOption} onChange={setSortOption} />
          <Button variant="outline" size="icon" onClick={() => setShowNewGroupDialog(true)} className="shrink-0" aria-label="Créer un groupe">
            <FolderPlus className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground hidden sm:inline">{cars.length} spots</span>
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
              <h3 className="font-semibold text-lg">Aucune voiture</h3>
              <p className="text-muted-foreground text-sm mt-1">Spottez ou ajoutez votre première voiture !</p>
            </div>
          ) : sortOption === "brand" && !brandFilter && !groupFilter ? (
            <div className="grid gap-3">
              {carsByBrand.map(([brandName, brandCars]) => {
                const first = brandCars[0];
                return (
                  <div
                    key={brandName}
                    onClick={() => setSearchParams({ brand: brandName })}
                    className="rounded-xl border border-border/50 bg-card overflow-hidden cursor-pointer hover:border-primary/30 transition-colors flex"
                  >
                    <div className="w-28 h-28 shrink-0 overflow-hidden bg-secondary/20">
                      {first?.image_url ? (
                        <img src={first.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{brandName}</h3>
                        <p className="text-sm text-muted-foreground">{brandCars.length} véhicule{brandCars.length > 1 ? "s" : ""}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : sortOption === "group" && !brandFilter && !groupFilter ? (
            <div className="grid gap-3">
              {carsByGroup.map(({ id, name, cars: groupCars }) => {
                const first = groupCars[0];
                return (
                  <div
                    key={id}
                    onClick={() => setSearchParams({ group: id })}
                    className="rounded-xl border border-border/50 bg-card overflow-hidden cursor-pointer hover:border-primary/30 transition-colors flex"
                  >
                    <div className="w-28 h-28 shrink-0 overflow-hidden bg-secondary/20">
                      {first?.image_url ? (
                        <img src={first.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{name}</h3>
                        <p className="text-sm text-muted-foreground">{groupCars.length} véhicule{groupCars.length > 1 ? "s" : ""}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            sortedCars.map((car) => (
              <div
                key={car.id}
                className="rounded-xl border border-border/50 bg-card overflow-hidden relative"
              >
                <div className="flex items-center justify-between gap-2 absolute top-2 right-2 z-10">
                  <Select
                    value={car.garage_group_id ?? "none"}
                    onValueChange={(v) => handleAssignGroup(car.id, v === "none" ? null : v)}
                  >
                    <SelectTrigger className="w-[130px] h-8 rounded-full bg-black/40 text-white border-0 text-xs">
                      <SelectValue placeholder="Groupe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun groupe</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-red-500/90 hover:text-white"
                    onClick={(e) => handleDelete(e, car.id)}
                    disabled={deletingId === car.id}
                    aria-label="Supprimer le spot"
                  >
                    {deletingId === car.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
                <div onClick={() => navigate(`/car/${car.id}`)} className="cursor-pointer">
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
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau groupe</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Nom du groupe (ex : Mes BMW)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              className="flex-1"
            />
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || creatingGroup}>
              {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button onClick={() => navigate("/add-car")} className="w-full h-12 text-base font-bold rounded-xl gap-2">
          <Plus className="h-5 w-5" /> Add a Car
        </Button>
      </div>
    </div>
  );
};

export default MyGarage;

