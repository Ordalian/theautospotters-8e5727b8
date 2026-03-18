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

const SCREENSHOTS_PER_CATEGORY = 3;

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
    <div className="min-h-viewport w-full max-w-full overflow-x-hidden relative">
      <BlackGoldBg />

      <div className="relative z-10 flex flex-col min-h-viewport w-full max-w-full overflow-x-hidden">
        {/* Sticky language switcher — always visible at top */}
        <header className="sticky top-0 z-50 flex items-center justify-end gap-1 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur shadow-sm" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
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

        {/* Sticky CTA — bottom (respects safe area on notched devices) */}
        <div className="fixed z-50 right-4 md:right-6" style={{ bottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))' }}>
          <Button asChild size="lg" className="shadow-lg ring-2 ring-primary/20">
            <Link to="/auth">{t.landing_try_me as string}</Link>
          </Button>
        </div>

        {/* Hero — keep compact so features section is visible after a short scroll */}
        <section className="flex min-h-[50vh] flex-col items-center justify-center px-4 pt-6 pb-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6 border border-primary/20">
            <Car className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-center text-foreground">
            {t.landing_welcome as string}
          </h1>
          <p className="mt-3 text-muted-foreground text-center max-w-md text-lg slogan-tagline">
            {t.landing_tagline as string}
          </p>
          <div className="flex gap-3 mt-8">
            <Button asChild size="lg">
              <Link to="/auth">{t.landing_connect as string}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/tryout">{t.tryout_button as string}</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/80">
            {t.landing_scroll_hint as string}
          </p>
        </section>

        {/* Feature sections with 2–3 screenshots per category */}
        <section className="border-t border-border/50">
          <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
            {FEATURES.map(({ key: featureKey, icon: Icon }) => (
              <Card
                key={featureKey}
                className="rounded-2xl border-border bg-card overflow-hidden transition-all duration-300 hover:scale-[1.01]"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/30 border border-border/50">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h2 className="font-heading text-base font-semibold text-foreground">
                        {t[`landing_feature_${featureKey}_title`] as string}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t[`landing_feature_${featureKey}_desc`] as string}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: SCREENSHOTS_PER_CATEGORY }, (_, i) => i + 1).map((n) => (
                      <AppScreenshot
                        key={`${featureKey}-${n}`}
                        src={`/landing/${featureKey}-${n}.png`}
                        alt={`${t[`landing_feature_${featureKey}_title`] as string} ${n}`}
                        tagline={t.landing_tagline as string}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Bottom CTA + Legal */}
        <section className="border-t border-border/50 mt-auto px-4 py-10 flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm text-center max-w-sm slogan-tagline">
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
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden min-h-[100px] flex items-center justify-center p-3">
        <p className="text-muted-foreground text-center text-xs font-medium slogan-tagline line-clamp-2">{tagline}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden aspect-[3/4] max-h-40">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default Landing;
