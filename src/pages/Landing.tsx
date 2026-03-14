import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Car,
  Layers,
  MapPin,
  MessageSquare,
  Users,
  User,
  ChevronDown,
  Zap,
  Trophy,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  { key: "garage", icon: Car, accent: "from-amber-500 to-orange-600" },
  { key: "cards", icon: Layers, accent: "from-violet-500 to-purple-600" },
  { key: "map", icon: MapPin, accent: "from-emerald-500 to-green-600" },
  { key: "messaging", icon: MessageSquare, accent: "from-sky-500 to-blue-600" },
  { key: "friends", icon: Users, accent: "from-pink-500 to-rose-600" },
  { key: "profile", icon: User, accent: "from-yellow-500 to-amber-600" },
] as const;

const STATS = [
  { icon: Car, labelKey: "landing_stat_cars" },
  { icon: Trophy, labelKey: "landing_stat_cards" },
  { icon: Zap, labelKey: "landing_stat_battles" },
  { icon: Shield, labelKey: "landing_stat_pois" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 sm:left-auto sm:right-6 sm:translate-x-0">
        <Button asChild size="lg" className="shadow-glow rounded-full px-8">
          <Link to="/auth">{t.landing_try_me as string}</Link>
        </Button>
      </div>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-accent/10 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 mb-8 ring-1 ring-primary/20"
        >
          <Car className="h-12 w-12 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative z-10 text-5xl sm:text-6xl font-bold tracking-tight max-w-xl leading-[1.1]"
        >
          {t.landing_welcome as string}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="relative z-10 mt-5 text-lg text-muted-foreground max-w-md"
        >
          {t.landing_tagline as string}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="relative z-10 mt-12"
        >
          <Button asChild size="lg" className="gap-2 rounded-full px-10 text-base">
            <Link to="/auth">{t.landing_connect as string}</Link>
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="h-6 w-6 text-muted-foreground animate-bounce" />
        </motion.div>
      </section>

      {/* ── Feature sections ── */}
      <section className="relative">
        {FEATURES.map(({ key, icon: Icon, accent }, i) => {
          const isEven = i % 2 === 0;
          return (
            <div
              key={key}
              className={`border-t border-border/30 ${isEven ? "bg-muted/20" : "bg-background"}`}
            >
              <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  custom={0}
                  className={`flex flex-col gap-8 items-center text-center sm:text-left sm:flex-row ${
                    !isEven ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  {/* Icon card */}
                  <div
                    className={`flex-shrink-0 flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-3xl bg-gradient-to-br ${accent} shadow-lg`}
                  >
                    <Icon className="h-14 w-14 sm:h-16 sm:w-16 text-white" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                      {t[`landing_feature_${key}_title`] as string}
                    </h2>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-lg leading-relaxed">
                      {t[`landing_feature_${key}_desc`] as string}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-border/30 bg-muted/20">
        <div className="mx-auto max-w-2xl px-6 py-24 flex flex-col items-center text-center gap-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-3xl sm:text-4xl font-bold tracking-tight"
          >
            {t.landing_tagline as string}
          </motion.h2>
          <Button asChild size="lg" className="rounded-full px-10 text-base">
            <Link to="/auth">{t.landing_try_me as string}</Link>
          </Button>
          <Link
            to="/legal"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-4"
          >
            {t.landing_legal as string}
          </Link>
        </div>
      </section>

      {/* Bottom spacer for sticky button */}
      <div className="h-20" />
    </div>
  );
};

export default Landing;
