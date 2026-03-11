import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Shield, ShieldOff, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserRoleBadge from "@/components/UserRoleBadge";
import { toast } from "sonner";

interface UserRow {
  user_id: string;
  username: string | null;
  role: string;
  is_premium: boolean;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFounder, loading: roleLoading } = useUserRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, role, is_premium")
        .order("username");
      return (data ?? []) as UserRow[];
    },
    enabled: !!user && isFounder,
    staleTime: 30_000,
  });

  const filtered = search.trim()
    ? users.filter((u) => u.username?.toLowerCase().includes(search.toLowerCase()))
    : users;

  const toggleAdmin = async (targetUserId: string, currentRole: string) => {
    if (!isFounder) return;
    const newRole = currentRole === "admin" ? "user" : "admin";
    setUpdating(targetUserId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole } as any)
        .eq("user_id", targetUserId);
      if (error) throw error;
      toast.success(newRole === "admin" ? "Admin accordé" : "Admin retiré");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setUpdating(null);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isFounder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldOff className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">Accès réservé au fondateur.</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Administration</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.user_id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium truncate">
                    {u.username || "—"}
                  </span>
                  <UserRoleBadge role={u.role} isPremium={u.is_premium} />
                </div>
                {u.role !== "founder" && (
                  <Button
                    size="sm"
                    variant={u.role === "admin" ? "destructive" : "outline"}
                    className="shrink-0 gap-1.5"
                    disabled={updating === u.user_id}
                    onClick={() => toggleAdmin(u.user_id, u.role)}
                  >
                    {updating === u.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : u.role === "admin" ? (
                      <>
                        <ShieldOff className="h-4 w-4" />
                        Retirer admin
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Rendre admin
                      </>
                    )}
                  </Button>
                )}
                {u.role === "founder" && (
                  <span className="text-xs text-muted-foreground font-medium">Fondateur</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
