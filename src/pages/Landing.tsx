import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BlackGoldBg from "@/components/BlackGoldBg";
import { Car, Layers, MapPin, MessageSquare, Users, User, Loader2 } from "lucide-react";

const FEATURES = [
  { key: "garage", icon: Car },
  { key: "cards", icon: Layers },
  { key: "map", icon: MapPin },
  { key: "messaging", icon: MessageSquare },
  { key: "friends", icon: Users },
  { key: "profile", icon: User },
] as const;

const SCREENSHOT_PATH = "/landing/preview.png";

const Landing = () => {
  const { user, loading } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <BlackGoldBg />
        <div className="relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen relative">
      <BlackGoldBg />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Sticky language switcher — top */}
        <header className="sticky top-0 z-50 flex items-center justify-end gap-1 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur">
          <button
            type="button"
            onClick={() => setLanguage("fr")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              language === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.auth_language_fr as string}
          </button>
          <span className="text-muted-foreground/50 text-sm">|</span>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.auth_language_en as string}
          </button>
        </header>

        {/* Sticky CTA — bottom */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button asChild size="lg" className="shadow-lg ring-2 ring-primary/20">
            <Link to="/auth">{t.landing_try_me as string}</Link>
          </Button>
        </div>

        {/* Hero */}
        <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 pt-8 pb-16">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6 border border-primary/20">
            <Car className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-center text-foreground">
            {t.landing_welcome as string}
          </h1>
          <p className="mt-3 text-muted-foreground text-center max-w-md text-lg">
            {t.landing_tagline as string}
          </p>
          <Button asChild size="lg" className="mt-10 gap-2">
            <Link to="/auth">{t.landing_connect as string}</Link>
          </Button>
        </section>

        {/* App screenshot — add public/landing/preview.png to show a screenshot from the app */}
        <section className="border-t border-border/50 px-4 py-10">
          <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            {t.landing_app_preview as string}
          </h2>
          <div className="mx-auto max-w-2xl">
            <AppScreenshot src={SCREENSHOT_PATH} alt={t.landing_app_preview as string} tagline={t.landing_tagline as string} />
          </div>
        </section>

        {/* Feature sections — same tile style as Dashboard */}
        <section className="border-t border-border/50">
          <div className="mx-auto max-w-2xl px-4 py-12 space-y-4">
            {FEATURES.map(({ key, icon: Icon }) => (
              <Card
                key={key}
                className="rounded-2xl border-border bg-card overflow-hidden transition-all duration-300 hover:scale-[1.01]"
              >
                <CardContent className="p-4 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/30 border border-border/50">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h2 className="font-heading text-base font-semibold text-foreground">
                        {t[`landing_feature_${key}_title`] as string}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t[`landing_feature_${key}_desc`] as string}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Bottom CTA + Legal */}
        <section className="border-t border-border/50 mt-auto px-4 py-10 flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            {t.landing_tagline as string}
          </p>
          <Button asChild size="lg">
            <Link to="/auth">{t.landing_try_me as string}</Link>
          </Button>
          <Link
            to="/legal"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-2"
          >
            {t.landing_legal as string}
          </Link>
        </section>
      </div>
    </div>
  );
};

/** Shows an app screenshot; if the image fails to load, shows the tagline in app style instead. */
function AppScreenshot({ src, alt, tagline }: { src: string; alt: string; tagline: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Card className="rounded-2xl border-border bg-card/80 overflow-hidden">
        <CardContent className="flex items-center justify-center min-h-[200px] p-6">
          <p className="text-muted-foreground text-center text-lg font-medium">{tagline}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-card overflow-hidden">
      <img
        src={src}
        alt={alt}
        className="w-full object-contain bg-muted/20"
        onError={() => setFailed(true)}
      />
    </Card>
  );
}

export default Landing;
