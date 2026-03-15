import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Eye, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserRoleBadge from "@/components/UserRoleBadge";

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
  "/store": "Boutique",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${s % 60}s`;
  return `${Math.floor(m / 60)}h${m % 60}m`;
}

interface ActivityData {
  username: string | null;
  email: string;
  role: string;
  created_at: string;
  total_time_ms: number;
  pages: { page: string; visit_count: number; total_duration_ms: number }[];
  hours: { hour: number; visit_count: number }[];
  features: { feature: string; use_count: number }[];
}

export default function UserActivity() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["user-activity", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_user_activity_detail", { p_user_id: userId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as ActivityData;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Utilisateur introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/admin")}>Retour</Button>
      </div>
    );
  }

  // Build hour histogram - fill all 24 hours
  const hourMap = new Map(data.hours.map((h) => [h.hour, h.visit_count]));
  const allHours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourMap.get(i) || 0,
  }));
  const maxHourCount = Math.max(1, ...allHours.map((h) => h.count));

  // Find peak hour
  const peakHour = allHours.reduce((a, b) => (b.count > a.count ? b : a), allHours[0]);

  const maxPageVisits = data.pages[0]?.visit_count || 1;
  const maxFeatureUses = data.features[0]?.use_count || 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{data.username || data.email}</h1>
          <p className="text-[10px] text-muted-foreground truncate">{data.email}</p>
        </div>
        <UserRoleBadge role={data.role} />
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{formatDuration(data.total_time_ms)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Temps total</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <Eye className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{data.pages.reduce((s, p) => s + p.visit_count, 0)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pages vues</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <Zap className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold">{data.features.reduce((s, f) => s + f.use_count, 0)}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Actions</p>
          </div>
        </div>

        {/* Peak activity */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Heure de pointe</p>
          <p className="text-2xl font-bold">{peakHour.hour}h00 – {peakHour.hour + 1}h00</p>
          <p className="text-xs text-muted-foreground">{peakHour.count} visite{peakHour.count > 1 ? "s" : ""}</p>
        </div>

        {/* Hour histogram */}
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activité par heure</p>
          <div className="flex items-end gap-[2px] h-20">
            {allHours.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all"
                  style={{ height: `${Math.max(3, (h.count / maxHourCount) * 100)}%` }}
                  title={`${h.hour}h: ${h.count} visites`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground px-0.5">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>

        {/* Pages breakdown */}
        {data.pages.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pages visitées</p>
            <div className="space-y-2">
              {data.pages.map((p) => (
                <div key={p.page}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium truncate">{PAGE_LABELS[p.page] || p.page}</span>
                    <span className="text-muted-foreground text-xs shrink-0 ml-2">
                      {p.visit_count}× · {formatDuration(p.total_duration_ms)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(p.visit_count / maxPageVisits) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features breakdown */}
        {data.features.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fonctionnalités utilisées</p>
            <div className="space-y-2">
              {data.features.map((f) => (
                <div key={f.feature}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium">{f.feature}</span>
                    <span className="text-muted-foreground text-xs">{f.use_count}×</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${(f.use_count / maxFeatureUses) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account info */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Informations</p>
          <p className="text-sm"><span className="text-muted-foreground">Inscrit le :</span> {new Date(data.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
    </div>
  );
}
