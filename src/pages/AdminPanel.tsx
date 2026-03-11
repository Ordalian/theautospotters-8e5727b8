import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Shield, ShieldOff, Loader2, Search, BarChart3,
  Users, MessageSquare, Trash2, ChevronRight, Send, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserRoleBadge from "@/components/UserRoleBadge";
import { toast } from "sonner";

// ───── Types ─────

interface AdminUser {
  user_id: string;
  email: string;
  username: string | null;
  role: string;
  is_premium: boolean;
  created_at: string;
  car_count: number;
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
      const { data } = await supabase.rpc("get_top_pages", { p_limit: 10 });
      return (data ?? []) as TopPage[];
    },
    staleTime: 60_000,
  });

  const { data: topFeatures = [] } = useQuery({
    queryKey: ["admin-top-features"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_top_features", { p_limit: 10 });
      return (data ?? []) as TopFeature[];
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

// ───── Users Tab ─────

function UsersTab() {
  const { isFounder } = useUserRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_users_for_admin");
      return (data ?? []) as AdminUser[];
    },
    staleTime: 30_000,
  });

  const filtered = search.trim()
    ? users.filter((u) =>
        (u.username?.toLowerCase().includes(search.toLowerCase())) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const toggleAdmin = async (targetUserId: string, currentRole: string) => {
    if (!isFounder) return;
    const newRole = currentRole === "admin" ? "user" : "admin";
    setUpdating(targetUserId);
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole } as any).eq("user_id", targetUserId);
      if (error) throw error;
      toast.success(newRole === "admin" ? "Admin accordé" : "Admin retiré");
      qc.invalidateQueries({ queryKey: ["admin-users-full"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.user_id} className="rounded-xl border border-border/50 bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm flex items-center gap-1 truncate">
                    {u.username || "—"}
                    <UserRoleBadge role={u.role} isPremium={u.is_premium} />
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {u.car_count} spot{u.car_count > 1 ? "s" : ""} · inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {isFounder && u.role !== "founder" && (
                  <Button
                    size="sm"
                    variant={u.role === "admin" ? "destructive" : "outline"}
                    className="shrink-0 gap-1"
                    disabled={updating === u.user_id}
                    onClick={() => toggleAdmin(u.user_id, u.role)}
                  >
                    {updating === u.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : u.role === "admin" ? (
                      <><ShieldOff className="h-3.5 w-3.5" /> Retirer</>
                    ) : (
                      <><Shield className="h-3.5 w-3.5" /> Admin</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
      const { data: profiles } = await supabase.from("profiles").select("user_id, username").in("user_id", userIds);
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
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, role").in("user_id", userIds);
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
                    <UserRoleBadge role={r.role} />
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
