import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Shield, ShieldOff, Loader2, Search, BarChart3,
  Users, MessageSquare, Trash2, ChevronRight, Send, X, MapPin, Gem,
  Plus, ChevronDown, ChevronUp, Eye, EyeOff, UserPlus, Flag, UserX,
  Ban, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserRoleBadge from "@/components/UserRoleBadge";
import { toast } from "sonner";

// ───── Types ─────

interface AdminUser {
  user_id: string;
  email: string;
  username: string | null;
  role: string;
  is_premium: boolean;
  is_map_marker: boolean;
  created_at: string;
  car_count: number;
  flagged_for_deletion?: boolean;
  flagged_by?: string | null;
}

interface FlaggedUser extends AdminUser {
  flagger_username?: string | null;
}

interface AdminStats {
  total_users: number;
  total_spots: number;
  total_miniatures: number;
  total_messages: number;
  total_dms: number;
  total_deliveries: number;
  total_tickets: number;
  open_tickets: number;
}

interface TopPage { page: string; visit_count: number; avg_duration_ms: number }
interface TopFeature { feature: string; use_count: number }

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  username?: string;
}

interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  created_at: string;
  username?: string;
  role?: string;
}

type Tab = "stats" | "users" | "support";

// ───── Helpers ─────

const PAGE_LABELS: Record<string, string> = {
  "/home": "Accueil",
  "/garage": "Garage",
  "/garage-menu": "Menu Garage",
  "/add-car": "Ajouter véhicule",
  "/profile": "Profil",
  "/profile/settings": "Paramètres",
  "/profile/stats": "Statistiques",
  "/profile/achievements": "Succès",
  "/friends": "Amis",
  "/messaging": "Messagerie",
  "/card-game": "Jeu de cartes",
  "/leaderboard": "Classement",
  "/map": "Carte",
  "/autospotter": "AutoSpotter",
  "/admin": "Admin",
  "/support": "Support",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function rpcAny<T>(fn: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase as any).rpc(fn, params);
  if (error) throw error;
  return data as T;
}

// ───── Stats Tab ─────

function StatsTab() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const data = await rpcAny<AdminStats[]>("get_admin_stats");
      if (!data || data.length === 0) return null;
      return data[0];
    },
    staleTime: 60_000,
  });

  const { data: topPages = [] } = useQuery({
    queryKey: ["admin-top-pages"],
    queryFn: async () => {
      const data = await rpcAny<TopPage[]>("get_top_pages", { p_limit: 10 });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: topFeatures = [] } = useQuery({
    queryKey: ["admin-top-features"],
    queryFn: async () => {
      const data = await rpcAny<TopFeature[]>("get_top_features", { p_limit: 10 });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  if (!stats) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const cards = [
    { label: "Utilisateurs", value: stats.total_users },
    { label: "Spots", value: stats.total_spots },
    { label: "Miniatures", value: stats.total_miniatures },
    { label: "Messages canal", value: stats.total_messages },
    { label: "Messages privés", value: stats.total_dms },
    { label: "Livraisons", value: stats.total_deliveries },
    { label: "Tickets support", value: stats.total_tickets },
    { label: "Tickets ouverts", value: stats.open_tickets },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border/50 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value.toLocaleString("fr-FR")}</p>
          </div>
        ))}
      </div>

      {topPages.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pages les plus visitées</p>
          <div className="space-y-2">
            {topPages.map((p, i) => {
              const maxVisits = topPages[0]?.visit_count || 1;
              return (
                <div key={p.page}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium truncate">{PAGE_LABELS[p.page] || p.page}</span>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">
                      {p.visit_count} · {formatDuration(p.avg_duration_ms)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(p.visit_count / maxVisits) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topFeatures.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fonctionnalités les plus utilisées</p>
          <div className="space-y-2">
            {topFeatures.map((f) => {
              const maxUses = topFeatures[0]?.use_count || 1;
              return (
                <div key={f.feature}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium">{f.feature}</span>
                    <span className="text-muted-foreground text-xs">{f.use_count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${(f.use_count / maxUses) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ───── Temp Users Section ─────

interface TempUser {
  user_id: string;
  username: string | null;
  created_at: string;
  is_map_marker: boolean;
}

function TempUsersSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: tempUsers = [], isLoading } = useQuery({
    queryKey: ["admin-temp-users"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("manage-temp-users", {
        body: { action: "list" },
      });
      if (res.error) throw res.error;
      return (res.data?.users ?? []) as TempUser[];
    },
    staleTime: 30_000,
  });

  const handleCreate = async () => {
    if (!username.trim() || !password.trim()) return;
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("manage-temp-users", {
        body: { action: "create", username: username.trim(), password: password.trim() },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message || "Erreur");
      toast.success(`Compte "${username.trim()}" créé`);
      setUsername("");
      setPassword("");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-temp-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    setDeleting(userId);
    try {
      const res = await supabase.functions.invoke("manage-temp-users", {
        body: { action: "delete", user_id: userId },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message || "Erreur");
      toast.success("Compte temporaire supprimé");
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-temp-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Comptes temporaires</span>
          <span className="text-xs text-muted-foreground">({tempUsers.length})</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3">
          <Button size="sm" className="gap-1 w-full" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Créer un compte temp
          </Button>

          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : tempUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Aucun compte temporaire.</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {tempUsers.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{u.username || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                      {u.is_map_marker && " · Map maker"}
                    </p>
                  </div>
                  {confirmDelete === u.user_id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={deleting === u.user_id} onClick={() => handleDelete(u.user_id)}>
                        {deleting === u.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmer"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(u.user_id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer un compte temporaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nom d'utilisateur</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: testeur1"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe (= code d'accès)</label>
              <div className="relative mt-1">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" disabled={!username.trim() || !password.trim() || creating} onClick={handleCreate}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer le compte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───── Users Tab ─────

function UsersTab() {
  const { user } = useAuth();
  const { isFounder, isStaff } = useUserRole();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0 = none, 1 = first confirm, 2 = deleting
  const [signupsToggling, setSignupsToggling] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: roleCounts } = useQuery({
    queryKey: ["admin-role-counts"],
    queryFn: async () => {
      const data = await rpcAny<{ admin_count: number; map_marker_count: number; premium_count: number } | { admin_count: number; map_marker_count: number; premium_count: number }[]>("get_admin_role_counts");
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? { admin_count: 0, map_marker_count: 0, premium_count: 0 };
    },
    staleTime: 60_000,
  });

  const { data: searchResults = [], isLoading: searchLoading, isError: searchError } = useQuery({
    queryKey: ["admin-users-search", searchDebounce],
    queryFn: async () => {
      if (!searchDebounce || searchDebounce.length < 3) return [];
      const data = await rpcAny<AdminUser[]>("get_users_search", { p_query: searchDebounce });
      return (data ?? []).map((u) => ({ ...u, is_map_marker: u.is_map_marker ?? false }));
    },
    enabled: searchDebounce.length >= 3,
    staleTime: 10_000,
  });

  // Signups toggle (founder only)
  const { data: signupsEnabled = true } = useQuery({
    queryKey: ["admin-signups-status"],
    queryFn: async () => {
      const { data } = await supabase.from("app_config").select("value").eq("key", "signups_enabled").maybeSingle();
      return data?.value === true || data?.value === "true";
    },
    staleTime: 30_000,
  });

  // Flagged users
  const { data: flaggedUsers = [] } = useQuery({
    queryKey: ["admin-flagged-users"],
    queryFn: async () => {
      const data = await rpcAny<FlaggedUser[]>("get_flagged_users");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const canEditAdmin = isFounder;
  const canEditMapMarkerOrPremium = isFounder || isStaff;

  const setUserRole = async (targetUserId: string, newRole: "user" | "admin") => {
    if (!isFounder) return;
    setUpdating(targetUserId);
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole } as any).eq("user_id", targetUserId);
      if (error) throw error;
      toast.success(newRole === "admin" ? "Admin accordé" : "Rôle utilisateur");
      qc.invalidateQueries({ queryKey: ["admin-role-counts"] });
      if (selectedUser?.user_id === targetUserId) setSelectedUser((prev) => prev ? { ...prev, role: newRole } : null);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setUpdating(null); }
  };

  const setMapMarker = async (targetUserId: string, value: boolean) => {
    if (!canEditMapMarkerOrPremium) return;
    if (selectedUser?.role === "founder") return;
    setUpdating(targetUserId);
    try {
      const { error } = await supabase.from("profiles").update({ is_map_marker: value } as any).eq("user_id", targetUserId);
      if (error) throw error;
      toast.success(value ? "Map maker accordé" : "Map maker retiré");
      qc.invalidateQueries({ queryKey: ["admin-role-counts"] });
      if (selectedUser?.user_id === targetUserId) setSelectedUser((prev) => prev ? { ...prev, is_map_marker: value } : null);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setUpdating(null); }
  };

  const togglePremium = async (targetUserId: string, currentPremium: boolean) => {
    if (!canEditMapMarkerOrPremium) return;
    setUpdating(targetUserId);
    try {
      const updates: any = { is_premium: !currentPremium };
      if (!currentPremium) updates.premium_until = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      else updates.premium_until = null;
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", targetUserId);
      if (error) throw error;
      toast.success(!currentPremium ? "Premium accordé" : "Premium retiré");
      qc.invalidateQueries({ queryKey: ["admin-role-counts"] });
      if (selectedUser?.user_id === targetUserId) setSelectedUser((prev) => prev ? { ...prev, is_premium: !currentPremium } : null);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setUpdating(null); }
  };

  const handleToggleSignups = async () => {
    if (!isFounder) return;
    setSignupsToggling(true);
    try {
      const res = await supabase.functions.invoke("manage-temp-users", {
        body: { action: "toggle_signups", enabled: !signupsEnabled },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success(!signupsEnabled ? "Inscriptions activées" : "Inscriptions suspendues");
      qc.invalidateQueries({ queryKey: ["admin-signups-status"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setSignupsToggling(false); }
  };

  const handleFlagUser = async (targetUserId: string) => {
    setUpdating(targetUserId);
    try {
      const res = await supabase.functions.invoke("manage-temp-users", {
        body: { action: "flag_user", user_id: targetUserId },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success("Compte signalé pour suppression");
      qc.invalidateQueries({ queryKey: ["admin-flagged-users"] });
      if (selectedUser?.user_id === targetUserId) setSelectedUser((prev) => prev ? { ...prev, flagged_for_deletion: true } : null);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setUpdating(null); }
  };

  const handleUnflagUser = async (targetUserId: string) => {
    setUpdating(targetUserId);
    try {
      const res = await supabase.functions.invoke("manage-temp-users", {
        body: { action: "unflag_user", user_id: targetUserId },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success("Signalement retiré");
      qc.invalidateQueries({ queryKey: ["admin-flagged-users"] });
      if (selectedUser?.user_id === targetUserId) setSelectedUser((prev) => prev ? { ...prev, flagged_for_deletion: false } : null);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); } finally { setUpdating(null); }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!isFounder) return;
    setDeleteStep(2);
    try {
      const res = await supabase.functions.invoke("manage-temp-users", {
        body: { action: "delete_user", user_id: targetUserId },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success("Compte supprimé définitivement");
      setSelectedUser(null);
      setDeleteStep(0);
      qc.invalidateQueries({ queryKey: ["admin-flagged-users"] });
      qc.invalidateQueries({ queryKey: ["admin-role-counts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la suppression");
      setDeleteStep(0);
    }
  };

  const counts = roleCounts ?? { admin_count: 0, map_marker_count: 0, premium_count: 0 };

  return (
    <div className="space-y-4">
      {/* Signup toggle — founder only */}
      {isFounder && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {signupsEnabled ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Ban className="h-5 w-5 text-destructive" />}
            <div>
              <p className="text-sm font-semibold">{signupsEnabled ? "Inscriptions ouvertes" : "Inscriptions suspendues"}</p>
              <p className="text-[10px] text-muted-foreground">Les comptes temporaires ne sont pas affectés</p>
            </div>
          </div>
          <Button size="sm" variant={signupsEnabled ? "destructive" : "outline"} disabled={signupsToggling} onClick={handleToggleSignups}>
            {signupsToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : signupsEnabled ? "Suspendre" : "Activer"}
          </Button>
        </div>
      )}

      {/* Three tiles */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Shield className="h-6 w-6 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{Number(counts.admin_count)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admin</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <MapPin className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{Number(counts.map_marker_count)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Map maker</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Gem className="h-6 w-6 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{Number(counts.premium_count)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Premium</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou email..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
          onFocus={() => searchDebounce.length >= 3 && setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          className="pl-9"
        />
        {dropdownOpen && searchDebounce.length >= 3 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg z-50 max-h-64 overflow-y-auto">
            {searchLoading ? (
              <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : searchError ? (
              <p className="p-4 text-sm text-destructive text-center">Erreur de recherche.</p>
            ) : searchResults.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Aucun utilisateur trouvé.</p>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u.user_id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0 flex items-center justify-between gap-2"
                  onClick={() => { setSelectedUser({ ...u, is_map_marker: u.is_map_marker ?? false }); setDropdownOpen(false); setSearchQuery(""); setDeleteStep(0); }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{u.username || u.email || "—"}</span>
                    {u.flagged_for_deletion && <Flag className="h-3 w-3 text-destructive" />}
                  </div>
                  <UserRoleBadge role={u.role} isPremium={u.is_premium} isMapMarker={u.is_map_marker} />
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Tape un nom ou un email puis sélectionne un utilisateur pour modifier ses rôles.</p>

      {/* Flagged accounts — visible to staff */}
      {flaggedUsers.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-sm text-destructive">Comptes signalés ({flaggedUsers.length})</span>
          </div>
          <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
            {flaggedUsers.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{u.username || u.email || "—"}</p>
                    <UserRoleBadge role={u.role} isPremium={u.is_premium} isMapMarker={u.is_map_marker} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Signalé par {u.flagger_username || "inconnu"} · {u.car_count} spot{u.car_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={updating === u.user_id} onClick={() => handleUnflagUser(u.user_id)}>
                    {updating === u.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </Button>
                  {isFounder && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => { setSelectedUser(u); setDeleteStep(0); }}>
                      <UserX className="h-3 w-3" /> Gérer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Temp users — founder only */}
      {isFounder && <TempUsersSection />}

      {/* User profile modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) { setSelectedUser(null); setDeleteStep(0); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gestion utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground">{selectedUser.username || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {selectedUser.car_count} spot{selectedUser.car_count !== 1 ? "s" : ""} · inscrit le {new Date(selectedUser.created_at).toLocaleDateString("fr-FR")}
                </p>
                {selectedUser.flagged_for_deletion && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1"><Flag className="h-3 w-3" /> Signalé pour suppression</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <UserRoleBadge role={selectedUser.role} isPremium={selectedUser.is_premium} isMapMarker={selectedUser.is_map_marker} />
              </div>
              {(canEditAdmin || canEditMapMarkerOrPremium) && selectedUser.role !== "founder" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  {/* Role toggles */}
                  {canEditAdmin && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">Admin</span>
                      <Button size="sm" variant={selectedUser.role === "admin" ? "destructive" : "outline"} className="gap-1" disabled={updating === selectedUser.user_id} onClick={() => setUserRole(selectedUser.user_id, selectedUser.role === "admin" ? "user" : "admin")}>
                        {updating === selectedUser.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : selectedUser.role === "admin" ? "Retirer" : "Accorder"}
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Map maker</span>
                    <Button size="sm" variant={selectedUser.is_map_marker ? "destructive" : "outline"} className="gap-1" disabled={updating === selectedUser.user_id} onClick={() => setMapMarker(selectedUser.user_id, !selectedUser.is_map_marker)}>
                      {updating === selectedUser.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : selectedUser.is_map_marker ? "Retirer" : "Accorder"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Premium</span>
                    <Button size="sm" variant={selectedUser.is_premium ? "destructive" : "outline"} className="gap-1" disabled={updating === selectedUser.user_id} onClick={() => togglePremium(selectedUser.user_id, selectedUser.is_premium)}>
                      {updating === selectedUser.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : selectedUser.is_premium ? "Retirer" : "Accorder"}
                    </Button>
                  </div>

                  {/* Flag / Unflag */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <span className="text-sm flex items-center gap-1"><Flag className="h-3.5 w-3.5" /> Signaler</span>
                    {selectedUser.flagged_for_deletion ? (
                      <Button size="sm" variant="outline" className="gap-1" disabled={updating === selectedUser.user_id} onClick={() => handleUnflagUser(selectedUser.user_id)}>
                        {updating === selectedUser.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Retirer le signalement"}
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" className="gap-1" disabled={updating === selectedUser.user_id} onClick={() => handleFlagUser(selectedUser.user_id)}>
                        {updating === selectedUser.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Signaler"}
                      </Button>
                    )}
                  </div>

                  {/* Delete — founder only, double confirmation */}
                  {isFounder && (
                    <div className="pt-2 border-t border-destructive/30">
                      {deleteStep === 0 && (
                        <Button size="sm" variant="destructive" className="w-full gap-1" onClick={() => setDeleteStep(1)}>
                          <UserX className="h-3.5 w-3.5" /> Supprimer le compte
                        </Button>
                      )}
                      {deleteStep === 1 && (
                        <div className="space-y-2">
                          <p className="text-xs text-destructive font-semibold text-center">⚠️ Cette action est irréversible. Confirmer la suppression ?</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setDeleteStep(0)}>Annuler</Button>
                            <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => handleDeleteUser(selectedUser.user_id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Confirmer
                            </Button>
                          </div>
                        </div>
                      )}
                      {deleteStep === 2 && (
                        <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-destructive" /></div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {selectedUser.role === "founder" && (
                <p className="text-xs text-muted-foreground">Le fondateur a tous les rôles par défaut.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───── Support Tab ─────

function SupportTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data: ticketsData } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (!ticketsData?.length) return [];
      const userIds = [...new Set(ticketsData.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username").in("user_id", userIds);
      const pMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);
      return ticketsData.map((t: any) => ({ ...t, username: pMap.get(t.user_id) || null })) as Ticket[];
    },
    staleTime: 30_000,
  });

  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ["admin-ticket-replies", selectedTicket?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_replies")
        .select("*")
        .eq("ticket_id", selectedTicket!.id)
        .order("created_at", { ascending: true });
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username, role").in("user_id", userIds);
      const pMap = new Map(profiles?.map((p: any) => [p.user_id, { username: p.username, role: p.role }]) || []);
      return data.map((r: any) => ({ ...r, username: pMap.get(r.user_id)?.username || null, role: pMap.get(r.user_id)?.role || "user" })) as TicketReply[];
    },
    enabled: !!selectedTicket,
    staleTime: 15_000,
  });

  const handleReply = async () => {
    if (!replyBody.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      await supabase.from("support_replies").insert({ ticket_id: selectedTicket.id, user_id: user.id, body: replyBody.trim() } as any);
      await supabase.from("support_tickets").update({ status: "replied" } as any).eq("id", selectedTicket.id);
      setReplyBody("");
      qc.invalidateQueries({ queryKey: ["admin-ticket-replies", selectedTicket.id] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (ticketId: string, status: string) => {
    await supabase.from("support_tickets").update({ status } as any).eq("id", ticketId);
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => prev ? { ...prev, status } : prev);
    }
  };

  if (selectedTicket) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedTicket(null)}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>

        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              selectedTicket.status === "open" ? "bg-amber-500/20 text-amber-500" :
              selectedTicket.status === "replied" ? "bg-blue-500/20 text-blue-500" :
              "bg-muted text-muted-foreground"
            }`}>
              {selectedTicket.status}
            </span>
            <div className="flex gap-1">
              {selectedTicket.status !== "closed" && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => changeStatus(selectedTicket.id, "closed")}>
                  Fermer
                </Button>
              )}
              {selectedTicket.status === "closed" && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => changeStatus(selectedTicket.id, "open")}>
                  Rouvrir
                </Button>
              )}
            </div>
          </div>
          <h3 className="font-bold text-sm">{selectedTicket.subject}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{selectedTicket.username || "Anonyme"} · {formatDate(selectedTicket.created_at)}</p>
          <p className="text-sm mt-3 whitespace-pre-wrap">{selectedTicket.body}</p>
        </div>

        {repliesLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : replies.length > 0 ? (
          <div className="space-y-2">
            {replies.map((r) => {
              const isStaffReply = r.role === "founder" || r.role === "admin";
              return (
                <div key={r.id} className={`rounded-xl border p-3 ${isStaffReply ? "border-primary/30 bg-primary/5 ml-4" : "border-border/40 bg-card mr-4"}`}>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    {r.username || "Anonyme"}
                    <UserRoleBadge role={r.role} isMapMarker={(r as any).is_map_marker} />
                    · {formatDate(r.created_at)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                </div>
              );
            })}
          </div>
        ) : null}

        {selectedTicket.status !== "closed" && (
          <div className="flex gap-2">
            <Input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Répondre..."
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && replyBody.trim()) { e.preventDefault(); handleReply(); } }}
            />
            <Button size="icon" disabled={!replyBody.trim() || sending} onClick={handleReply}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tickets.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-12">Aucun ticket de support.</p>
      ) : (
        tickets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTicket(t)}
            className="w-full text-left rounded-xl border border-border/50 bg-card p-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                t.status === "open" ? "bg-amber-500/20 text-amber-500" :
                t.status === "replied" ? "bg-blue-500/20 text-blue-500" :
                "bg-muted text-muted-foreground"
              }`}>
                {t.status}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm truncate">{t.subject}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {t.username || "Anonyme"} · {formatDate(t.created_at)}
            </p>
          </button>
        ))
      )}
    </div>
  );
}

// ───── Main Admin Panel ─────

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isStaff, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState<Tab>("stats");

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldOff className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
        <Button variant="outline" onClick={() => navigate("/profile")}>Retour</Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "stats", label: "Stats", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "users", label: "Utilisateurs", icon: <Users className="h-4 w-4" /> },
    { id: "support", label: "Support", icon: <MessageSquare className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Administration</h1>
      </header>

      <div className="flex border-b border-border/50">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {tab === "stats" && <StatsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "support" && <SupportTab />}
      </div>
    </div>
  );
};

export default AdminPanel;
