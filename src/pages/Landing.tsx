import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Car, Layers, MapPin, MessageSquare, Users, User, ChevronDown } from "lucide-react";

const FEATURES = [
  { key: "garage",    icon: Car,           color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/20" },
  { key: "cards",     icon: Layers,        color: "text-teal-400",    bg: "bg-teal-400/10 border-teal-400/20" },
  { key: "map",       icon: MapPin,        color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20" },
  { key: "messaging", icon: MessageSquare, color: "text-orange-300",  bg: "bg-orange-300/10 border-orange-300/20" },
  { key: "friends",   icon: Users,         color: "text-teal-300",    bg: "bg-teal-300/10 border-teal-300/20" },
  { key: "profile",   icon: User,          color: "text-red-300",     bg: "bg-red-300/10 border-red-300/20" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
  }),
};

/* Pixel-art garage door SVG — rendered inline so no asset needed */
function GarageDoor() {
  return (
    <svg
      viewBox="0 0 120 100"
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wall */}
      <rect width="120" height="100" fill="#1a0a0a" />
      {/* Door frame */}
      <rect x="10" y="10" width="100" height="78" fill="#2a0d0d" />
      {/* Door panels — horizontal slats */}
      {[10, 22, 34, 46, 58, 70].map((y) => (
        <rect key={y} x="10" y={y} width="100" height="11" fill="#3d1010" stroke="#1a0a0a" strokeWidth="1" />
      ))}
      {/* Door vertical divider */}
      <rect x="59" y="10" width="2" height="68" fill="#1a0a0a" />
      {/* Number 3 — pixel art on door */}
      {/* Top bar */}
      <rect x="46" y="22" width="28" height="4" fill="#e85d04" />
      {/* Mid-right */}
      <rect x="66" y="22" width="8" height="14" fill="#e85d04" />
      {/* Mid bar */}
      <rect x="46" y="32" width="28" height="4" fill="#e85d04" />
      {/* Bot-right */}
      <rect x="66" y="36" width="8" height="14" fill="#e85d04" />
      {/* Bottom bar */}
      <rect x="46" y="46" width="28" height="4" fill="#e85d04" />
      {/* Glow underneath door */}
      <rect x="10" y="82" width="100" height="6" fill="#e85d04" opacity="0.9" />
      <rect x="0" y="86" width="120" height="14" fill="#e85d04" opacity="0.25" />
      {/* Ground glow spread */}
      <ellipse cx="60" cy="92" rx="55" ry="8" fill="#f48c06" opacity="0.3" />
      {/* Door handle */}
      <rect x="44" y="72" width="6" height="4" fill="#f48c06" />
      <rect x="70" y="72" width="6" height="4" fill="#f48c06" />
    </svg>
  );
}

const Landing = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden relative"
      style={{ background: "linear-gradient(180deg, #0d0303 0%, #1a0505 50%, #0d0303 100%)" }}
    >
      {/* Pixel dot grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, #e85d04 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Language switcher */}
      <header
        className="fixed top-0 right-0 z-50 flex items-center gap-1 px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {(["fr", "en"] as const).map((lang, i) => (
          <>
            {i > 0 && <span key="sep" className="text-orange-900/60 text-sm">|</span>}
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 rounded text-sm font-mono font-medium transition-colors ${
                language === lang
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  : "text-orange-900 hover:text-orange-600"
              }`}
            >
              {t[`auth_language_${lang}`] as string}
            </button>
          </>
        ))}
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center z-10">

        {/* Garage door logo */}
        <motion.div
          className="w-36 h-36 mb-8"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <GarageDoor />
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-6xl font-bold tracking-tight"
          style={{ color: "#f5e6d3", fontFamily: "monospace" }}
          custom={0} initial="hidden" animate="visible" variants={fadeUp}
        >
          AUTO<span style={{ color: "#e85d04" }}>SPOTTER</span>
        </motion.h1>

        <motion.div
          className="mt-4 flex items-center gap-2 text-base sm:text-lg font-mono font-medium"
          custom={1} initial="hidden" animate="visible" variants={fadeUp}
        >
          {["Spot", "Collect", "Compete"].map((word, i) => (
            <span key={word} className="flex items-center gap-2">
              <span style={{ color: "#c4a882" }}>{word}</span>
              {i < 2 && <span style={{ color: "#e85d04" }}>·</span>}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none"
          custom={2} initial="hidden" animate="visible" variants={fadeUp}
        >
          <Button
            asChild size="lg"
            className="w-full sm:w-auto px-8 font-mono"
            style={{ background: "#e85d04", color: "#fff", border: "none" }}
          >
            <Link to="/auth">{t.landing_connect as string}</Link>
          </Button>
          <Button
            asChild size="lg" variant="outline"
            className="w-full sm:w-auto px-8 font-mono"
            style={{ borderColor: "#e85d04", color: "#e85d04", background: "transparent" }}
          >
            <Link to="/tryout">{t.tryout_button as string}</Link>
          </Button>
        </motion.div>

        {/* Scroll arrow */}
        <motion.button
          className="absolute bottom-8 flex flex-col items-center gap-0 cursor-pointer p-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Scroll to features"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.15, 1, 0.15], y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", delay: i * 0.18 }}
            >
              <ChevronDown className="h-6 w-6 -mt-1.5" style={{ color: "#e85d04" }} />
            </motion.div>
          ))}
        </motion.button>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 px-4 pb-16 pt-4 max-w-2xl mx-auto">
        {/* Section divider */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #e85d04, transparent)" }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#e85d04" }}>Features</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #e85d04, transparent)" }} />
        </div>

        <div className="grid grid-cols-1 gap-2">
          {FEATURES.map(({ key, icon: Icon, color, bg }, i) => (
            <motion.div
              key={key}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              className={`flex items-start gap-4 rounded border p-4 transition-colors hover:bg-white/[0.03] ${bg}`}
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={`font-mono font-semibold text-sm ${color}`}>
                  {t[`landing_feature_${key}_title`] as string}
                </p>
                <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#9a7a5a" }}>
                  {t[`landing_feature_${key}_desc`] as string}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section
        className="relative z-10 px-6 py-12 flex flex-col items-center gap-5"
        style={{
          borderTop: "1px solid rgba(232, 93, 4, 0.2)",
          paddingBottom: "max(3rem, calc(1.5rem + env(safe-area-inset-bottom)))",
        }}
      >
        <p className="font-mono text-sm text-center" style={{ color: "#9a7a5a" }}>
          {t.landing_tagline as string}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Button
            asChild size="lg"
            className="w-full sm:w-auto px-8 font-mono"
            style={{ background: "#e85d04", color: "#fff", border: "none" }}
          >
            <Link to="/auth">{t.landing_try_me as string}</Link>
          </Button>
          <Button
            asChild size="lg" variant="ghost"
            className="w-full sm:w-auto font-mono"
            style={{ color: "#9a7a5a" }}
          >
            <Link to="/tryout">{t.tryout_button as string}</Link>
          </Button>
        </div>
        <Link
          to="/legal"
          className="text-xs font-mono underline underline-offset-2"
          style={{ color: "#5a3a1a" }}
        >
          {t.landing_legal as string}
        </Link>
      </section>
    </div>
  );
};

export default Landing;
