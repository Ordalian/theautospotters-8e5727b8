import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowLeft, User, Settings, BarChart3, Trophy, Newspaper, Shield, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasUnreadPatchNotes } from "@/lib/patchNotes";
import { useUserRole } from "@/hooks/useUserRole";
import UserRoleBadge from "@/components/UserRoleBadge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLevelProgress } from "@/lib/leveling";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const unreadNews = hasUnreadPatchNotes();
  const { isFounder, isStaff, role, is_premium, isMapMarker } = useUserRole();

  const { data: profile } = useQuery({
    queryKey: ["profile-header", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url, total_xp, coins, hide_email")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { username: string | null; avatar_url: string | null; total_xp: number; coins: number; hide_email: boolean } | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: spotCount = 0 } = useQuery({
    queryKey: ["profile-spot-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("cars")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .neq("vehicle_type", "hot_wheels");
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const totalXp = profile?.total_xp ?? 0;
  const levelProgress = getLevelProgress(totalXp);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const tiles = [
    {
      icon: Settings,
      label: t.profile_tile_settings as string,
      desc: t.profile_tile_settings_desc as string,
      path: "/profile/settings",
    },
    {
      icon: BarChart3,
      label: t.profile_tile_stats as string,
      desc: t.profile_tile_stats_desc as string,
      path: "/profile/stats",
    },
    {
      icon: Trophy,
      label: t.profile_tile_achievements as string,
      desc: t.profile_tile_achievements_desc as string,
      path: "/profile/achievements",
    },
    {
      icon: Newspaper,
      label: t.profile_tile_news as string,
      desc: t.profile_tile_news_desc as string,
      path: "/profile/news",
      badge: unreadNews,
    },
    {
      icon: MessageSquare,
      label: "Support",
      desc: t.profile_support_desc as string || "Poser une question ou signaler un problème",
      path: "/support",
      subtle: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background relative pb-24">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.profile_title as string}</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4 relative z-10">
        {/* Profile card */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-primary/30" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-lg truncate flex items-center gap-1.5">
                {profile?.username || user?.email?.split("@")[0] || "—"}
                <UserRoleBadge role={role} isPremium={is_premium} isMapMarker={isMapMarker} />
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.hide_email ? "••••••@••••" : user?.email}
              </p>
            </div>
          </div>

          {/* Level bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">
                {(t.level_label as string)} {levelProgress.level}
              </span>
              {levelProgress.level < 100 && (
                <span className="text-muted-foreground tabular-nums">
                  {levelProgress.xpInCurrentLevel.toLocaleString()} / {levelProgress.xpRequiredForCurrentLevel.toLocaleString()} XP
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${levelProgress.progressFraction * 100}%` }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold">{spotCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spots</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{totalXp.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">XP</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{(profile?.coins ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coins</p>
            </div>
          </div>
        </div>

        {/* Menu tiles */}
        <div className="space-y-2">
          {tiles.map((tile) => (
            <button
              key={tile.path}
              type="button"
              onClick={() => navigate(tile.path)}
              className={`w-full flex items-center gap-4 p-4 text-left rounded-xl border transition-colors ${
                tile.subtle
                  ? "border-border/50 bg-card hover:border-primary/30"
                  : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative">
                <tile.icon className="h-5 w-5 text-primary" />
                {tile.badge && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{tile.label}</p>
                <p className="text-xs text-muted-foreground truncate">{tile.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Admin tile */}
        {isStaff && (
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-4 p-4 text-left rounded-xl border-2 border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">Administration</p>
              <p className="text-xs text-muted-foreground truncate">Stats, utilisateurs et support</p>
            </div>
          </button>
        )}

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-3 text-sm text-destructive/80 hover:text-destructive rounded-xl border border-destructive/20 hover:border-destructive/40 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t.profile_sign_out as string || "Se déconnecter"}
        </button>
      </div>
    </div>
  );
};

export default Profile;
