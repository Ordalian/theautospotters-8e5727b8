import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Check, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FriendRequest {
  id: string;
  requester_id: string;
  username: string | null;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

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
      </div>
    </div>
  );
};

export default Profile;
