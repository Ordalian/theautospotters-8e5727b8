import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UserPlus, Car, X, Check, Package } from "lucide-react";
import BlackGoldBg from "@/components/BlackGoldBg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import GarageSortSelect, { type GarageSortOption } from "@/components/GarageSortSelect";

interface Friend {
  user_id: string;
  username: string | null;
  friendship_id: string;
}

interface FriendCar {
  id: string;
  brand: string;
  model: string;
  year: number;
  engine: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  username: string | null;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  username: string | null;
}

interface DeliveryNotification {
  id: string;
  sender_username: string | null;
  car_brand: string;
  car_model: string;
  created_at: string;
}

const FriendsGarages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchUsername, setSearchUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendCars, setFriendCars] = useState<FriendCar[]>([]);
  const [recentSpots, setRecentSpots] = useState<FriendCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendSort, setFriendSort] = useState<GarageSortOption>("newest");
  const [removeConfirm, setRemoveConfirm] = useState<{ friendshipId: string; username: string } | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [lastDeliveryAt, setLastDeliveryAt] = useState<string | null>(null);
  const [deliveryPopupOpen, setDeliveryPopupOpen] = useState(false);
  const [deliveryNotifications, setDeliveryNotifications] = useState<DeliveryNotification[]>([]);
  const [tick, setTick] = useState(0);

  const DELIVERY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  const deliveryCooldown = useMemo(() => {
    if (!lastDeliveryAt) return { active: false, remainingMs: 0 };
    const end = new Date(lastDeliveryAt).getTime() + DELIVERY_COOLDOWN_MS;
    const remaining = end - Date.now();
    return { active: remaining > 0, remainingMs: Math.max(0, remaining) };
  }, [lastDeliveryAt, tick]);

  const deliveryTimerFormatted = useMemo(() => {
    if (!deliveryCooldown.active) return "24:00:00";
    const s = Math.floor((deliveryCooldown.remainingMs / 1000) % 60);
    const m = Math.floor((deliveryCooldown.remainingMs / 60000) % 60);
    const h = Math.floor(deliveryCooldown.remainingMs / 3600000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [deliveryCooldown.active, deliveryCooldown.remainingMs]);

  const deliveryCircleProgress = useMemo(() => {
    if (!deliveryCooldown.active) return 1;
    return 1 - deliveryCooldown.remainingMs / DELIVERY_COOLDOWN_MS;
  }, [deliveryCooldown.active, deliveryCooldown.remainingMs]);

  const sortedFriendCars = useMemo(() => {
    const sorted = [...friendCars];
    switch (friendSort) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "brand":
        return sorted.sort((a, b) => a.brand.localeCompare(b.brand));
      default:
        return sorted;
    }
  }, [friendCars, friendSort]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchDeliveryState();
    }
  }, [user]);

  useEffect(() => {
    if (!lastDeliveryAt) return;
    const end = new Date(lastDeliveryAt).getTime() + DELIVERY_COOLDOWN_MS;
    if (end <= Date.now()) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [lastDeliveryAt]);

  const fetchDeliveryState = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_delivery_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setLastDeliveryAt(profile?.last_delivery_at ?? null);

    const { data: deliveries } = await supabase
      .from("deliveries")
      .select("id, sender_id, car_id, created_at")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (deliveries?.length) {
      const senderIds = [...new Set(deliveries.map((d) => d.sender_id))];
      const carIds = deliveries.map((d) => d.car_id);
      const [profilesRes, carsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, username").in("user_id", senderIds),
        supabase.from("cars").select("id, brand, model").in("id", carIds),
      ]);
      const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p.username]) || []);
      const carMap = new Map(carsRes.data?.map((c) => [c.id, c]) || []);
      setDeliveryNotifications(
        deliveries.map((d) => ({
          id: d.id,
          sender_username: profileMap.get(d.sender_id) ?? null,
          car_brand: carMap.get(d.car_id)?.brand ?? "?",
          car_model: carMap.get(d.car_id)?.model ?? "?",
          created_at: d.created_at,
        }))
      );
    } else {
      setDeliveryNotifications([]);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id")
      .eq("addressee_id", user.id)
      .eq("status", "pending");
    if (data?.length) {
      const userIds = data.map((r) => r.requester_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, username").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);
      setRequests(data.map((r) => ({ ...r, username: profileMap.get(r.requester_id) || null })));
    } else {
      setRequests([]);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (data && data.length > 0) {
      const friendUserIds = data.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", friendUserIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);

      const friendsList = data.map((f) => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        return { user_id: friendId, username: profileMap.get(friendId) || null, friendship_id: f.id };
      });
      setFriends(friendsList);

      // Fetch recent spots from all friends (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: spots } = await supabase
        .from("cars")
        .select("id, brand, model, year, engine, image_url, created_at, user_id")
        .in("user_id", friendUserIds)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20);

      if (spots) {
        setRecentSpots(
          spots.map((s) => ({ ...s, username: profileMap.get(s.user_id) || null }))
        );
      }
    } else {
      setFriends([]);
      setRecentSpots([]);
    }
    fetchRequests();
    setLoading(false);
  };

  const handleAddFriend = async () => {
    if (!user || !searchUsername.trim()) return;
    setSending(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", searchUsername.trim())
        .maybeSingle();

      if (!profile) {
        toast.error("Utilisateur introuvable");
        setSending(false);
        return;
      }
      if (profile.user_id === user.id) {
        toast.error("Vous ne pouvez pas vous ajouter vous-même");
        setSending(false);
        return;
      }

      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: profile.user_id,
      });

      if (error) {
        if (error.code === "23505") toast.error("Demande déjà envoyée");
        else toast.error(error.message);
      } else {
        toast.success("Demande d'ami envoyée !");
        setSearchUsername("");
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
    setSending(false);
  };

  const handleSelectFriend = async (friend: Friend) => {
    setSelectedFriend(friend);
    const { data } = await supabase
      .from("cars")
      .select("id, brand, model, year, engine, image_url, created_at, user_id")
      .eq("user_id", friend.user_id)
      .order("created_at", { ascending: false });
    setFriendCars(
      (data || []).map((c) => ({ ...c, username: friend.username }))
    );
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) {
      toast.error(error.message || "Impossible de retirer cet ami");
      return;
    }
    toast.success("Ami retiré");
    setRemoveConfirm(null);
    setSelectedFriend(null);
    setFriendCars([]);
    fetchFriends();
  };

  const handleAcceptRequest = async (id: string) => {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    if (error) {
      toast.error(error.message || "Erreur");
      return;
    }
    toast.success("Demande acceptée !");
    fetchFriends(); // rafraîchit amis + demandes
  };

  const handleDeclineRequest = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast.success("Demande refusée");
    fetchRequests();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button variant="ghost" size="icon" onClick={() => selectedFriend ? setSelectedFriend(null) : navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">
          {selectedFriend ? `Garage de ${selectedFriend.username || "Ami"}` : "Garages d'amis"}
        </h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6 relative z-10">
        {!selectedFriend && (
          <>
            {/* Tuile Livraison */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {deliveryCooldown.active ? (
                <div className="flex items-center gap-4 p-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-muted/30"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                      />
                      <path
                        className="text-primary transition-all duration-1000"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="97.4"
                        strokeDashoffset={97.4 - 97.4 * deliveryCircleProgress}
                        fill="none"
                        strokeLinecap="round"
                        d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-lg">Livraison</p>
                    <p className="text-2xl font-mono tabular-nums text-muted-foreground">{deliveryTimerFormatted}</p>
                    <p className="text-xs text-muted-foreground">Prochaine livraison possible dans</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeliveryPopupOpen(true)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Livraison</p>
                    <p className="text-sm text-muted-foreground">Envoyer une voiture à un ami (1 fois / 24h)</p>
                  </div>
                </button>
              )}
            </div>

            <Dialog open={deliveryPopupOpen} onOpenChange={setDeliveryPopupOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Livraison</DialogTitle>
                  <DialogDescription>Voulez-vous livrer une voiture à un ami ?</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setDeliveryPopupOpen(false)} className="gap-1">
                    <X className="h-4 w-4" /> Non
                  </Button>
                  <Button onClick={() => { setDeliveryPopupOpen(false); navigate("/deliver-car"); }} className="gap-1">
                    <Check className="h-4 w-4" /> Oui
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Notifications livraisons reçues */}
            {deliveryNotifications.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Livraisons reçues
                </h2>
                {deliveryNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3"
                  >
                    <Package className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm">
                      <span className="font-semibold">{n.sender_username || "Quelqu'un"}</span>
                      {" vous a envoyé "}
                      <span className="font-semibold">{n.car_brand} {n.car_model}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Friend */}
            <div className="flex gap-2">
              <Input
                placeholder="Nom d'utilisateur..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="h-11"
                onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
              />
              <Button onClick={handleAddFriend} disabled={sending || !searchUsername.trim()} className="h-11 gap-1">
                <UserPlus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>

            {/* Demandes d'amis */}
            {requests.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Demandes d'amis ({requests.length})
                </h2>
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                  >
                    <span className="font-medium">{req.username || "Anonyme"}</span>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => handleAcceptRequest(req.id)} className="gap-1">
                        <Check className="h-4 w-4" /> Accepter
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleDeclineRequest(req.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Spots Carousel */}
            {recentSpots.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Spots récents de vos amis
                </h2>
                <Carousel className="w-full">
                  <CarouselContent>
                    {recentSpots.map((spot) => (
                      <CarouselItem key={spot.id} className="basis-2/3 md:basis-1/3">
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          {spot.image_url ? (
                            <img
                              src={spot.image_url}
                              alt={`${spot.brand} ${spot.model}`}
                              className="h-28 w-full object-cover"
                            />
                          ) : (
                            <div className="h-28 flex items-center justify-center bg-muted">
                              <Car className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="p-2">
                            <p className="font-bold text-sm">{spot.brand} {spot.model}</p>
                            <p className="text-xs text-muted-foreground">
                              {spot.username || "Ami"} • {spot.year}
                            </p>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            )}

            {/* Friends List */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Mes amis ({friends.length})
              </h2>
              {loading ? (
                <p className="text-muted-foreground text-sm animate-pulse">Chargement...</p>
              ) : friends.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun ami pour l'instant. Ajoutez-en un ci-dessus !</p>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.user_id}
                    onClick={() => handleSelectFriend(friend)}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary text-sm">
                          {(friend.username || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{friend.username || "Anonyme"}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemoveConfirm({
                          friendshipId: friend.friendship_id,
                          username: friend.username || "cet ami",
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </button>
                ))
)}
          </div>

          {/* Confirmation suppression ami */}
          <Dialog open={!!removeConfirm} onOpenChange={(open) => !open && setRemoveConfirm(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Retirer cet ami ?</DialogTitle>
                <DialogDescription>
                  {removeConfirm
                    ? `Êtes-vous sûr de vouloir retirer ${removeConfirm.username} de vos amis ? Cette action pourra être annulée en renvoyant une demande.`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setRemoveConfirm(null)}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (!removeConfirm) return;
                    handleRemoveFriend(removeConfirm.friendshipId);
                  }}
                >
                  Retirer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
        )}

        {/* Friend's Garage */}
        {selectedFriend && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <GarageSortSelect value={friendSort} onChange={setFriendSort} />
            </div>
            {sortedFriendCars.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ce garage est vide pour l'instant.</p>
            ) : (
              sortedFriendCars.map((car) => (
                <div key={car.id} onClick={() => navigate(`/car/${car.id}`)} className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/30 transition-colors">
                  {car.image_url ? (
                    <img src={car.image_url} alt={`${car.brand} ${car.model}`} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 flex items-center justify-center bg-muted">
                      <Car className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-bold">{car.brand} {car.model}</p>
                    <p className="text-sm text-muted-foreground">{car.year}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsGarages;
