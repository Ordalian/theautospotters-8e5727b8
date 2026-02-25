import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProfileAchievements = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.profile_tile_achievements as string}</h1>
      </header>
      <div className="p-6 max-w-md mx-auto flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground text-center">
          {t.profile_tile_achievements_desc as string}
        </p>
        <p className="text-sm text-muted-foreground/80 text-center">
          {t.profile_coming_soon as string}
        </p>
      </div>
    </div>
  );
};

export default ProfileAchievements;
