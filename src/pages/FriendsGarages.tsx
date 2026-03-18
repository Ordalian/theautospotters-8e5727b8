import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackFeature } from "@/hooks/useTrackFeature";
import { ArrowLeft, UserPlus, Car, X, Check, Package, ChevronRight, Coins, Ban, Search, ChevronDown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import BlackGoldBg from "@/components/BlackGoldBg";
import { Button } from "@/components/ui/button";
import UserRoleBadge from "@/components/UserRoleBadge";
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

/* Auto-scrolling carousel for friend spots */
function FriendSpotsAutoCarousel({ spots }: { spots: FriendCar[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (spots.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % spots.length), 4000);
    return () => clearInterval(timer);
  }, [spots.length]);

  return (
    <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border bg-card">
      {spots.map((spot, i) => (
        <div
          key={spot.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {spot.image_url ? (
            <img
              src={spot.image_url.includes('/storage/v1/object/public/')
                ? spot.image_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&quality=50'
                : spot.image_url}
              alt={`${spot.brand} ${spot.model}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-muted">
              <Car className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="font-bold text-sm text-foreground">{spot.brand} {spot.model}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {spot.username || "Ami"} <UserRoleBadge role={spot.role} isPremium={spot.is_premium} /> • {spot.year}
            </p>
          </div>
        </div>
      ))}
      {/* Dots */}
      <div className="absolute top-2 left-0 right-0 flex justify-center gap-1.5 z-10">
        {spots.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-300 ${i === idx ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-foreground/30"}`} />
        ))}
      </div>
    </div>
  );
}

interface Friend {
  user_id: string;
  username: string | null;
  friendship_id: string;
  role?: string | null;
  is_premium?: boolean;
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
  garage_group_id: string | null;
  role?: string | null;
  is_premium?: boolean;
}

interface FriendGarageGroup {
  id: string;
  name: string;
  sort_order: number;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  username: string | null;
  role?: string | null;
  is_premium?: boolean;
}

interface DeliveryNotification {
  id: string;
  sender_username: string | null;
  car_brand: string;
  car_model: string;
  created_at: string;
}

const FriendsGarages = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = `${location.pathname}${location.search || ""}`;
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchUsername, setSearchUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recentSpots, setRecentSpots] = useState<FriendCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeConfirm, setRemoveConfirm] = useState<{ friendshipId: string; username: string } | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [lastDeliveryAt, setLastDeliveryAt] = useState<string | null>(null);
  const [deliveryPopupOpen, setDeliveryPopupOpen] = useState(false);
  const [deliveryNotifications, setDeliveryNotifications] = useState<DeliveryNotification[]>([]);
  const [tick, setTick] = useState(0);
  const [myCoins, setMyCoins] = useState<number>(0);
  const [lastCoinSentAt, setLastCoinSentAt] = useState<string | null>(null);
  const [coinSendPopupOpen, setCoinSendPopupOpen] = useState(false);
  const [coinSendFriendId, setCoinSendFriendId] = useState<string | null>(null);
  const [coinSendAmount, setCoinSendAmount] = useState("");
  const [coinSending, setCoinSending] = useState(false);
  const [friendSearchFilter, setFriendSearchFilter] = useState("");
  const [friendsOpen, setFriendsOpen] = useState(true);
  // Block state
  const [blockUsername, setBlockUsername] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; user_id: string; username: string | null }[]>([]);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const DELIVERY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const COIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

  const coinCooldown = useMemo(() => {
    if (!lastCoinSentAt) return { active: false, remainingMs: 0 };
    const end = new Date(lastCoinSentAt).getTime() + COIN_COOLDOWN_MS;
    const remaining = end - Date.now();
    return { active: remaining > 0, remainingMs: Math.max(0, remaining) };
  }, [lastCoinSentAt, tick]);

  const handleSendCoin = async () => {
    if (!user || !coinSendFriendId || !coinSendAmount.trim()) return;
    const amount = parseInt(coinSendAmount.trim(), 10);
    if (isNaN(amount) || amount <= 0 || amount > myCoins) {
      toast.error(t.send_coin_insufficient as string);
      return;
    }
    setCoinSending(true);
    try {
      const { data } = await supabase.rpc("send_coins_to_friend", { p_to_user_id: coinSendFriendId, p_amount: amount });
      const result = data as { ok?: boolean; error?: string } | null;
      if (result?.ok) {
        setCoinSendPopupOpen(false);
        setCoinSendFriendId(null);
        setCoinSendAmount("");
        setMyCoins((c) => c - amount);
        setLastCoinSentAt(new Date().toISOString());
        toast.success(t.send_coin_success as string);
      } else {
        const msg = result?.error === "cooldown_24h" ? (t.send_coin_cooldown as string) : result?.error === "insufficient_coins" ? (t.send_coin_insufficient as string) : result?.error || "Error";
        toast.error(msg);
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setCoinSending(false);
    }
  };

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
      .select("last_delivery_at, coins, last_coin_sent_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setLastDeliveryAt(profile?.last_delivery_at ?? null);
    setMyCoins((profile as { coins?: number } | null)?.coins ?? 0);
    setLastCoinSentAt((profile as { last_coin_sent_at?: string | null } | null)?.last_coin_sent_at ?? null);

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
        supabase.from("profiles_public").select("user_id, username").in("user_id", senderIds),
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
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username, role, is_premium").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, { username: p.username, role: p.role, is_premium: p.is_premium }]) || []);
      setRequests(data.map((r) => ({ ...r, username: profileMap.get(r.requester_id)?.username || null, role: profileMap.get(r.requester_id)?.role ?? null, is_premium: profileMap.get(r.requester_id)?.is_premium ?? false })));
    } else {
      setRequests([]);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);
    try {
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
        .from("profiles_public")
        .select("user_id, username, role, is_premium")
        .in("user_id", friendUserIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, { username: p.username, role: p.role, is_premium: p.is_premium }]) || []);

      const friendsList = data.map((f) => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const prof = profileMap.get(friendId);
        return { user_id: friendId, username: prof?.username || null, friendship_id: f.id, role: prof?.role ?? null, is_premium: prof?.is_premium ?? false };
      });
      setFriends(friendsList);

      // Fetch recent spots from all friends (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: spots } = await supabase
        .from("cars")
        .select("id, brand, model, year, generation, engine, image_url, created_at, user_id, garage_group_id")
        .in("user_id", friendUserIds)
        .neq("vehicle_type", "hot_wheels")
        .order("created_at", { ascending: false })
        .limit(5);

      if (spots) {
        setRecentSpots(
          spots.map((s) => ({ ...s, username: profileMap.get(s.user_id)?.username || null, role: profileMap.get(s.user_id)?.role ?? null, is_premium: profileMap.get(s.user_id)?.is_premium ?? false }))
        );
      }
    } else {
      setFriends([]);
      setRecentSpots([]);
    }
    fetchRequests();
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
    setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user || !searchUsername.trim()) return;
    setSending(true);
    try {
      const { data: profile } = await supabase
        .from("profiles_public")
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
        trackFeature("friend_request_sent");
        toast.success("Demande d'ami envoyée !");
        setSearchUsername("");
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
    setSending(false);
  };

  const handleSelectFriend = (friend: Friend) => {
    navigate(`/friends/${friend.user_id}/stats`);
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) {
      toast.error(error.message || "Impossible de retirer cet ami");
      return;
    }
    toast.success("Ami retiré");
    setRemoveConfirm(null);
    fetchFriends();
  };

  const handleAcceptRequest = async (id: string) => {
    const { error } = await supabase.rpc("update_friendship_status", { p_friendship_id: id, p_new_status: "accepted" } as any);
    if (error) {
      toast.error(error.message || "Erreur");
      return;
    }
    toast.success("Demande acceptée !");
    fetchFriends();
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Garages d'amis</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6 relative z-10">
        {(
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
                    <p className="text-sm text-muted-foreground">Envoyer un véhicule à un ami (1 fois / 24h)</p>
                  </div>
                </button>
              )}
            </div>

            <Dialog open={deliveryPopupOpen} onOpenChange={setDeliveryPopupOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Livraison</DialogTitle>
                  <DialogDescription>Voulez-vous livrer un véhicule à un ami ?</DialogDescription>
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

            {/* Send coin — next to delivery */}
            <div className="rounded-xl border border-border bg-card overflow-hidden mt-3">
              {coinCooldown.active ? (
                <div className="flex items-center gap-4 p-4">
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Coins className="h-7 w-7 text-amber-500/50" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{t.send_coin as string}</p>
                    <p className="text-xs text-muted-foreground">{t.send_coin_cooldown as string}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCoinSendPopupOpen(true)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Coins className="h-7 w-7 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-lg">{t.send_coin as string}</p>
                    <p className="text-sm text-muted-foreground">{t.send_coin_sub as string}</p>
                  </div>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{myCoins}</span>
                </button>
              )}
            </div>

            <Dialog open={coinSendPopupOpen} onOpenChange={(open) => { setCoinSendPopupOpen(open); if (!open) { setCoinSendFriendId(null); setCoinSendAmount(""); } }}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t.send_coin_modal_title as string}</DialogTitle>
                  <DialogDescription>{t.send_coin_choose_friend as string}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t.send_coin_choose_friend as string}</p>
                    <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                      {friends.map((f) => (
                        <button
                          key={f.user_id}
                          type="button"
                          onClick={() => setCoinSendFriendId(f.user_id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm ${coinSendFriendId === f.user_id ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
                        >
                          {f.username || f.user_id}
                        </button>
                      ))}
                      {friends.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun ami</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t.send_coin_amount as string}</p>
                    <Input
                      type="number"
                      min={1}
                      max={myCoins}
                      value={coinSendAmount}
                      onChange={(e) => setCoinSendAmount(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Solde : {myCoins}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCoinSendPopupOpen(false)}>Annuler</Button>
                  <Button onClick={handleSendCoin} disabled={coinSending || !coinSendFriendId || !coinSendAmount.trim() || parseInt(coinSendAmount.trim(), 10) > myCoins}>
                    {coinSending ? "…" : (t.send_coin as string)}
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
                    <span className="font-medium flex items-center gap-1">{req.username || "Anonyme"} <UserRoleBadge role={req.role} isPremium={req.is_premium} /></span>
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

            {/* Recent Spots — Auto-scroll */}
            {recentSpots.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.friends_recent_spots as string}
                </h2>
                <FriendSpotsAutoCarousel spots={recentSpots} />
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
                      <span className="font-medium flex items-center gap-1">{friend.username || "Anonyme"} <UserRoleBadge role={friend.role} isPremium={friend.is_premium} /></span>
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

      </div>
    </div>
  );
};

export default FriendsGarages;
