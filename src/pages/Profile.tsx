import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, [user]);

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
        <h1 className="text-xl font-bold">My Profile</h1>
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
                Display Name
              </Label>
              <Input
                placeholder="Choose a username..."
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
              {saving ? "Saving..." : <><Check className="h-5 w-5" /> Save</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
