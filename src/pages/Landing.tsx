import { Navigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Car } from "lucide-react";

const Landing = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
        <Car className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-center">
        {t.landing_welcome as string}
      </h1>
      <p className="mt-3 text-muted-foreground text-center">
        {t.landing_tagline as string}
      </p>
      <Button asChild size="lg" className="mt-10 gap-2">
        <Link to="/auth">{t.landing_connect as string}</Link>
      </Button>
    </div>
  );
};

export default Landing;
