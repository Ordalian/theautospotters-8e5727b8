import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowLeft, User, Settings, BarChart3, Trophy, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasUnreadPatchNotes } from "@/lib/patchNotes";

const Profile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const unreadNews = hasUnreadPatchNotes();

  return (
    <div className="min-h-screen bg-background relative">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.profile_title as string}</h1>
      </header>

      <div className="p-6 max-w-md mx-auto space-y-4 relative z-10">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
            <User className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/profile/settings")}
          className="w-full flex items-center gap-4 p-4 text-left rounded-xl border-2 border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base">{t.profile_tile_settings as string}</p>
            <p className="text-sm text-muted-foreground truncate">{t.profile_tile_settings_desc as string}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile/stats")}
          className="w-full flex items-center gap-4 p-4 text-left rounded-xl border-2 border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base">{t.profile_tile_stats as string}</p>
            <p className="text-sm text-muted-foreground truncate">{t.profile_tile_stats_desc as string}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile/achievements")}
          className="w-full flex items-center gap-4 p-4 text-left rounded-xl border-2 border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base">{t.profile_tile_achievements as string}</p>
            <p className="text-sm text-muted-foreground truncate">{t.profile_tile_achievements_desc as string}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile/news")}
          className="w-full flex items-center gap-4 p-4 text-left rounded-xl border-2 border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors relative"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative">
            <Newspaper className="h-6 w-6 text-primary" />
            {unreadNews && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base">{t.profile_tile_news as string}</p>
            <p className="text-sm text-muted-foreground truncate">{t.profile_tile_news_desc as string}</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Profile;
