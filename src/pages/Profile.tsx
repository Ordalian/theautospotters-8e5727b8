import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Check, UserPlus, X, Car, Bell, Plus, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate as useNav } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callCarApi } from "@/lib/carApi";
import { resizeImage } from "@/lib/imageUtils";
import { PhotoUploadDialog } from "@/components/PhotoUpload";

interface FriendRequest {
  id: string;
  requester_id: string;
  username: string | null;
}

interface OwnedVehicleRow {
  id: string;
  car_id: string | null;
  created_at: string;
}

interface NotificationRow {
  id: string;
  type: string;
  data: { brand?: string; model?: string; year?: number; spotted_car_id?: string };
  read_at: string | null;
  created_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const navigateTo = useNav();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.username) setUsername(data.username);
      setLoading(false);
    };
    fetchProfile();
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (data && data.length > 0) {
      const userIds = data.map((r) => r.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);
      setRequests(data.map((r) => ({ ...r, username: profileMap.get(r.requester_id) || null })));
    } else {
      setRequests([]);
    }
  };

  const handleAccept = async (id: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    toast.success("Demande acceptée !");
    fetchRequests();
  };

  const handleDecline = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast.success("Demande refusée");
    fetchRequests();
  };

  const { data: ownedVehicles = [] } = useQuery({
    queryKey: ["owned-vehicles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("owned_vehicles")
        .select("id, car_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as OwnedVehicleRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, data, read_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as NotificationRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markNotificationRead = async (id: string) => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const handleAddOwnedVehicleFromPhoto = async (file: File) => {
    if (!user) return;
    setShowPhotoDialog(false);
    setAddingVehicle(true);
    try {
      const base64 = await resizeImage(file, 800, 0.7);
      const result = await callCarApi<{ license_plate: string | null }>({
        action: "identify_and_extract_plate",
        images: [base64],
      });
      const plate = result?.license_plate?.replace(/\s|-|\./g, "").toUpperCase().slice(0, 20);
      if (!plate || plate.length < 2) {
        toast.error("Aucune plaque lisible sur la photo. Prenez une photo où la plaque est visible.");
        return;
      }
      const { error } = await supabase.from("owned_vehicles").insert({
        user_id: user.id,
        license_plate: plate,
        car_id: null,
      });
      if (error) throw error;
      toast.success("Véhicule enregistré. Vous serez notifié s'il est spotté.");
      setShowAddVehicle(false);
      queryClient.invalidateQueries({ queryKey: ["owned-vehicles", user.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'analyse.");
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleRemoveOwnedVehicle = async (id: string) => {
    if (!user || !confirm("Retirer ce véhicule de la liste ?")) return;
    await supabase.from("owned_vehicles").delete().eq("id", id).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["owned-vehicles", user.id] });
    toast.success("Véhicule retiré.");
  };

  const handleSave = async () => {
    if (!user || !username.trim()) {
      toast.error("Please enter a username");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Username updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Mon Profil</h1>
      </header>

      <div className="p-6 max-w-md mx-auto space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
            <User className="h-10 w-10 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {!loading && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Nom d'affichage
              </Label>
              <Input
                placeholder="Choisir un pseudo..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-secondary/30 text-lg h-12"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !username.trim()}
              className="w-full h-12 text-base font-bold rounded-xl gap-2"
            >
              {saving ? "Saving..." : <><Check className="h-5 w-5" /> Sauvegarder</>}
            </Button>
          </div>
        )}

        {/* Mes véhicules en possession (privé, plaque jamais affichée) */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Mes véhicules en possession
          </h2>
          <p className="text-sm text-muted-foreground">Prenez une photo de votre véhicule pour l'enregistrer. Vous serez notifié si quelqu'un le spot.</p>
          {ownedVehicles.map((ov) => (
            <div key={ov.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <span className="text-sm font-medium">
                Véhicule enregistré · {new Date(ov.created_at).toLocaleDateString("fr-FR")}
              </span>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveOwnedVehicle(ov.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowAddVehicle(true)}>
            <Plus className="h-4 w-4" /> Ajouter un véhicule
          </Button>
        </div>

        {/* Notifications */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">{unreadCount}</span>
            )}
          </h2>
          {loadingNotifications ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune notification.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border border-border bg-card p-3 ${!n.read_at ? "border-primary/30 bg-primary/5" : ""}`}
                >
                  {n.type === "vehicle_spotted" && (
                    <>
                      <p className="font-medium">Votre véhicule a été spotté. Félicitations !</p>
                      {n.data?.brand && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {n.data.brand} {n.data.model} {n.data.year}
                        </p>
                      )}
                      {!n.read_at && (
                        <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => markNotificationRead(n.id)}>
                          Marquer comme lu
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friend Requests */}
        {requests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Demandes d'amis
            </h2>
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <span className="font-medium">{req.username || "Anonyme"}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAccept(req.id)} className="gap-1">
                    <Check className="h-4 w-4" /> Accepter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDecline(req.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un véhicule en possession</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Prenez une photo de votre véhicule (avec la plaque visible). L'analyse est confidentielle et aucune donnée de plaque n'est affichée.
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => { setShowAddVehicle(false); setShowPhotoDialog(true); }}
                disabled={addingVehicle}
              >
                <Camera className="h-5 w-5" />
                Prendre une photo
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { setShowAddVehicle(false); navigateTo("/autospotter?owned=1"); }}
                disabled={addingVehicle}
              >
                Ouvrir l'AutoSpotter (photo + identification)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <PhotoUploadDialog
          open={showPhotoDialog}
          onOpenChange={setShowPhotoDialog}
          onPhotoSelect={(file) => handleAddOwnedVehicleFromPhoto(file)}
        />
      </div>
    </div>
  );
};

export default Profile;
