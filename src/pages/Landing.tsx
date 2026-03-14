import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Car, Layers, MapPin, MessageSquare, Users, User } from "lucide-react";

const FEATURES = [
  { key: "garage", icon: Car },
  { key: "cards", icon: Layers },
  { key: "map", icon: MapPin },
  { key: "messaging", icon: MessageSquare },
  { key: "friends", icon: Users },
  { key: "profile", icon: User },
] as const;

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
    <div className="min-h-screen bg-background">
      {/* Sticky CTA */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button asChild size="lg" className="shadow-lg">
          <Link to="/auth">{t.landing_try_me as string}</Link>
        </Button>
      </div>

      {/* Hero */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-4 pt-16 pb-24">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Car className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-center">
          {t.landing_welcome as string}
        </h1>
        <p className="mt-3 text-muted-foreground text-center max-w-md">
          {t.landing_tagline as string}
        </p>
        <Button asChild size="lg" className="mt-10 gap-2">
          <Link to="/auth">{t.landing_connect as string}</Link>
        </Button>
      </section>

      {/* Feature sections */}
      <section className="border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-2xl px-4 py-16 space-y-20">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">
                {t[`landing_feature_${key}_title`] as string}
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                {t[`landing_feature_${key}_desc`] as string}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border/50 px-4 py-12 flex flex-col items-center gap-4">
        <p className="text-muted-foreground text-sm text-center">
          {t.landing_tagline as string}
        </p>
        <Button asChild size="lg">
          <Link to="/auth">{t.landing_try_me as string}</Link>
        </Button>
        <Link
          to="/legal"
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-4"
        >
          {t.landing_legal as string}
        </Link>
      </section>
    </div>
  );
};

export default Landing;
