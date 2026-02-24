import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BlackGoldBg from "@/components/BlackGoldBg";
import { toast } from "sonner";

interface Friend {
  user_id: string;
  username: string | null;
}

interface CarToDeliver {
  id: string;
  brand: string;
  model: string;
  year: number;
  image_url: string | null;
  [key: string]: unknown;
}

const DeliverSelectFriend = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const carId = searchParams.get("carId");
  const { user } = useAuth();
  const { t } = useLanguage();
  const [car, setCar] = useState<CarToDeliver | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const loadData = async () => {
    if (!user || !carId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const { data: carData } = await supabase
        .from("cars")
        .select("*")
        .eq("id", carId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!carData) {
        toast.error(t.deliver_car_not_found as string);
        navigate("/friends");
        return;
      }
      setCar(carData as CarToDeliver);

      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (friendships?.length) {
        const ids = friendships.map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", ids);
        setFriends(
          (profiles || []).map((p) => ({ user_id: p.user_id, username: p.username }))
        );
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !carId) {
      if (!carId) navigate("/friends");
      return;
    }
    loadData();
  }, [user, carId, navigate]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.trim().toLowerCase();
    return friends.filter(
      (f) =>
        (f.username || "").toLowerCase().includes(q) ||
        f.user_id.toLowerCase().includes(q)
    );
  }, [friends, searchQuery]);

  const handleDeliver = async () => {
    if (!user || !car || !selectedFriend) return;
    setDelivering(true);
    try {
      const insertPayload = {
        user_id: selectedFriend.user_id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        edition: (car.edition as string) ?? null,
        finitions: (car.finitions as string) ?? null,
        seen_on_road: (car.seen_on_road as boolean) ?? false,
        parked: (car.parked as boolean) ?? false,
        stock: (car.stock as boolean) ?? true,
        modified: (car.modified as boolean) ?? false,
        modified_comment: (car.modified_comment as string) ?? null,
        car_meet: (car.car_meet as boolean) ?? false,
        image_url: car.image_url,
        engine: (car.engine as string) ?? null,
        latitude: (car.latitude as number) ?? null,
        longitude: (car.longitude as number) ?? null,
        location_name: (car.location_name as string) ?? null,
        location_precision: (car.location_precision as string) ?? null,
        car_condition: (car.car_condition as string) ?? "good",
        photo_source: (car.photo_source as string) ?? null,
        quality_rating: (car.quality_rating as number) ?? 3,
        rarity_rating: (car.rarity_rating as number) ?? 5,
        delivered_by_user_id: user.id,
      };
      const { data: newCar, error: insertErr } = await supabase
        .from("cars")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      await supabase.from("deliveries").insert({
        sender_id: user.id,
        receiver_id: selectedFriend.user_id,
        car_id: newCar.id,
      });

      await supabase.from("cars").delete().eq("id", car.id).eq("user_id", user.id);

      await supabase
        .from("profiles")
        .update({ last_delivery_at: new Date().toISOString() })
        .eq("user_id", user.id);

      const successMsg = typeof t.deliver_success === "function"
        ? t.deliver_success(selectedFriend.username || (t.friend as string))
        : (t.deliver_success as string);
      toast.success(successMsg);
      navigate("/friends");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (t.deliver_error as string));
    } finally {
      setDelivering(false);
    }
  };

  if (loading && !car) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (loadError || (!loading && !car && carId)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground text-center">{loadError ? (t.error as string) : (t.deliver_car_not_found as string)}</p>
        <div className="flex gap-2">
          {loadError && <Button variant="outline" onClick={loadData}>{t.retry as string}</Button>}
          <Button onClick={() => navigate("/friends")}>{t.back as string}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/friends")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.deliver_select_friend_title as string}</h1>
      </header>

      <div className="relative z-10 p-6 max-w-md mx-auto space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          {car.image_url ? (
            <img
              src={car.image_url}
              alt={`${car.brand} ${car.model}`}
              className="h-16 w-16 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-bold">{car.brand} {car.model}</p>
            <p className="text-sm text-muted-foreground">{car.year}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">{t.deliver_select_friend as string}</label>
          <Input
            placeholder={t.deliver_search_friend as string}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary/30"
          />
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.deliver_no_friends as string}</p>
          ) : (
            filteredFriends.map((friend) => (
              <button
                key={friend.user_id}
                type="button"
                onClick={() => setSelectedFriend(friend)}
                className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  selectedFriend?.user_id === friend.user_id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary text-sm">
                    {(friend.username || "?")[0].toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">{friend.username || (t.anonymous as string)}</span>
              </button>
            ))
          )}
        </div>

        <Button
          className="w-full h-12 text-base font-bold"
          disabled={!selectedFriend || delivering}
          onClick={handleDeliver}
        >
          {delivering ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t.deliver_button as string
          )}
        </Button>
      </div>
    </div>
  );
};

export default DeliverSelectFriend;
