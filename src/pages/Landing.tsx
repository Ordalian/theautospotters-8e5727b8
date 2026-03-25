import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import { Car, Layers, MapPin, MessageSquare, Users, User, ChevronDown } from "lucide-react";

const FEATURES = [
  { key: "garage",    icon: Car },
  { key: "cards",     icon: Layers },
  { key: "map",       icon: MapPin },
  { key: "messaging", icon: MessageSquare },
  { key: "friends",   icon: Users },
  { key: "profile",   icon: User },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

const Landing = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      <BlackGoldBg showMarble />

      {/* Language switcher */}
      <header
        className="fixed top-0 right-0 z-50 flex items-center gap-1 px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {(["fr", "en"] as const).map((lang, i) => (
          <>
            {i > 0 && <span key="sep" className="text-muted-foreground/40 text-sm">|</span>}
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                language === lang
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t[`auth_language_${lang}`] as string}
            </button>
          </>
        ))}
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Car className="h-10 w-10 text-primary" />
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          Autospotter
        </motion.h1>

        <motion.p
          className="mt-4 text-xl sm:text-2xl font-medium tracking-wide"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          {(t.landing_tagline as string).split(/[.\s]+/).filter(Boolean).map((word, i, arr) => (
            <span key={i}>
              <span className="text-foreground/80">{word}</span>
              {i < arr.length - 1 && (
                <span className="text-primary mx-2">·</span>
              )}
            </span>
          ))}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <Button asChild size="lg" className="w-full sm:w-auto px-8">
            <Link to="/auth">{t.landing_connect as string}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto px-8">
            <Link to="/tryout">{t.tryout_button as string}</Link>
          </Button>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 flex flex-col items-center gap-1 text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="px-4 pb-16 pt-4 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 gap-3">
          {FEATURES.map(({ key, icon: Icon }, i) => (
            <motion.div
              key={key}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              className="flex items-start gap-4 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 hover:bg-card/60 transition-colors"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold text-sm text-foreground">
                  {t[`landing_feature_${key}_title`] as string}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {t[`landing_feature_${key}_desc`] as string}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section
        className="border-t border-border/30 px-6 py-12 flex flex-col items-center gap-5"
        style={{ paddingBottom: "max(3rem, calc(1.5rem + env(safe-area-inset-bottom)))" }}
      >
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          {t.landing_tagline as string}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto px-8">
            <Link to="/auth">{t.landing_try_me as string}</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
            <Link to="/tryout">{t.tryout_button as string}</Link>
          </Button>
        </div>
        <Link
          to="/legal"
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2"
        >
          {t.landing_legal as string}
        </Link>
      </section>
    </div>
  );
};

export default Landing;
