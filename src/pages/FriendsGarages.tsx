import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UserPlus, Car, X } from "lucide-react";
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
    if (user) fetchFriends();
  }, [user]);

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
    await supabase.from("friendships").delete().eq("id", friendshipId);
    toast.success("Ami retiré");
    setRemoveConfirm(null);
    setSelectedFriend(null);
    setFriendCars([]);
    fetchFriends();
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
                <Button variant="outline" onClick={() => setRemoveConfirm(null)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => removeConfirm && handleRemoveFriend(removeConfirm.friendshipId)}
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
