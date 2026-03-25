import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Car, Layers, MapPin, MessageSquare, Users, User, ChevronDown } from "lucide-react";

const FEATURES = [
  { key: "garage",    icon: Car,           color: "#F4780A", border: "rgba(244,120,10,0.25)" },
  { key: "cards",     icon: Layers,        color: "#40B5AD", border: "rgba(64,181,173,0.25)" },
  { key: "map",       icon: MapPin,        color: "#F4780A", border: "rgba(244,120,10,0.25)" },
  { key: "messaging", icon: MessageSquare, color: "#40B5AD", border: "rgba(64,181,173,0.25)" },
  { key: "friends",   icon: Users,         color: "#F4780A", border: "rgba(244,120,10,0.25)" },
  { key: "profile",   icon: User,          color: "#40B5AD", border: "rgba(64,181,173,0.25)" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
  }),
};

function GarageDoor() {
  return (
    <svg
      viewBox="0 0 120 100"
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wall */}
      <rect width="120" height="100" fill="#071212" />
      {/* Door frame outer */}
      <rect x="8" y="8" width="104" height="80" fill="#0d2424" stroke="#40B5AD" strokeWidth="1.5" />
      {/* Door panels — horizontal slats */}
      {[9, 21, 33, 45, 57, 69].map((y) => (
        <rect key={y} x="9" y={y} width="102" height="11" fill="#0a1e1e" stroke="#152e2e" strokeWidth="0.5" />
      ))}
      {/* Vertical centre divider */}
      <rect x="59" y="9" width="2" height="70" fill="#071212" />
      {/* AS monogram — pixel art */}
      {/* A left stroke */}
      <rect x="32" y="24" width="4" height="28" fill="#40B5AD" />
      {/* A right stroke */}
      <rect x="44" y="24" width="4" height="28" fill="#40B5AD" />
      {/* A top bar */}
      <rect x="32" y="24" width="16" height="4" fill="#40B5AD" />
      {/* A mid bar */}
      <rect x="32" y="36" width="16" height="4" fill="#40B5AD" />
      {/* S top bar */}
      <rect x="66" y="24" width="18" height="4" fill="#F4780A" />
      {/* S top-left */}
      <rect x="66" y="24" width="4" height="10" fill="#F4780A" />
      {/* S mid bar */}
      <rect x="66" y="34" width="18" height="4" fill="#F4780A" />
      {/* S bot-right */}
      <rect x="80" y="38" width="4" height="10" fill="#F4780A" />
      {/* S bot bar */}
      <rect x="66" y="48" width="18" height="4" fill="#F4780A" />
      {/* Glow strip under door */}
      <rect x="9" y="83" width="102" height="4" fill="#40B5AD" opacity="0.9" />
      <rect x="0"  y="87" width="120" height="13" fill="#40B5AD" opacity="0.15" />
      {/* Ground glow */}
      <ellipse cx="60" cy="95" rx="52" ry="7" fill="#40B5AD" opacity="0.2" />
      {/* Handles */}
      <rect x="42" y="73" width="6" height="4" fill="#F4780A" />
      <rect x="72" y="73" width="6" height="4" fill="#F4780A" />
    </svg>
  );
}

const Landing = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden relative"
      style={{ background: "linear-gradient(180deg, #040e0e 0%, #071a1a 60%, #040e0e 100%)" }}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, #40B5AD 0px, #40B5AD 1px, transparent 1px, transparent 4px)",
        }}
      />

      {/* Language switcher */}
      <header
        className="fixed top-0 right-0 z-50 flex items-center gap-1 px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {(["fr", "en"] as const).map((lang, i) => (
          <>
            {i > 0 && <span key="sep" className="text-sm" style={{ color: "rgba(64,181,173,0.3)" }}>|</span>}
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className="px-3 py-1.5 rounded text-sm font-mono font-medium transition-colors"
              style={
                language === lang
                  ? { background: "rgba(64,181,173,0.15)", color: "#40B5AD", border: "1px solid rgba(64,181,173,0.3)" }
                  : { color: "rgba(64,181,173,0.4)", border: "1px solid transparent" }
              }
            >
              {t[`auth_language_${lang}`] as string}
            </button>
          </>
        ))}
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center z-10">

        {/* Garage door */}
        <motion.div
          className="w-40 h-36 mb-8 drop-shadow-2xl"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <GarageDoor />
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-6xl font-bold tracking-tight font-mono"
          style={{ color: "#e8f4f4" }}
          custom={0} initial="hidden" animate="visible" variants={fadeUp}
        >
          AUTO<span style={{ color: "#40B5AD" }}>SPOTTER</span>
        </motion.h1>

        <motion.div
          className="mt-4 flex items-center gap-2 text-base sm:text-lg font-mono"
          style={{ color: "#6ab8b3" }}
          custom={1} initial="hidden" animate="visible" variants={fadeUp}
        >
          {["Spot", "Collect", "Compete"].map((word, i) => (
            <span key={word} className="flex items-center gap-2">
              <span>{word}</span>
              {i < 2 && <span style={{ color: "#F4780A" }}>·</span>}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none"
          custom={2} initial="hidden" animate="visible" variants={fadeUp}
        >
          <Button
            asChild size="lg"
            className="w-full sm:w-auto px-8 font-mono font-semibold border-0"
            style={{ background: "#40B5AD", color: "#040e0e" }}
          >
            <Link to="/auth">{t.landing_connect as string}</Link>
          </Button>
          <Button
            asChild size="lg"
            className="w-full sm:w-auto px-8 font-mono"
            style={{ background: "transparent", color: "#F4780A", border: "1px solid rgba(244,120,10,0.5)" }}
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
              <ChevronDown className="h-6 w-6 -mt-1.5" style={{ color: "#40B5AD" }} />
            </motion.div>
          ))}
        </motion.button>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 px-4 pb-16 pt-4 max-w-2xl mx-auto">
        {/* Divider */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #40B5AD55, transparent)" }} />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#40B5AD" }}>Features</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #40B5AD55, transparent)" }} />
        </div>

        <div className="grid grid-cols-1 gap-2">
          {FEATURES.map(({ key, icon: Icon, color, border }, i) => (
            <motion.div
              key={key}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              className="flex items-start gap-4 rounded p-4 transition-all"
              style={{
                background: "rgba(64,181,173,0.04)",
                border: `1px solid ${border}`,
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded"
                style={{ background: `${color}18`, border: `1px solid ${color}40` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="font-mono font-semibold text-sm" style={{ color }}>
                  {t[`landing_feature_${key}_title`] as string}
                </p>
                <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#4a8a85" }}>
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
          borderTop: "1px solid rgba(64,181,173,0.15)",
          paddingBottom: "max(3rem, calc(1.5rem + env(safe-area-inset-bottom)))",
        }}
      >
        <p className="font-mono text-sm text-center" style={{ color: "#4a8a85" }}>
          {t.landing_tagline as string}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Button
            asChild size="lg"
            className="w-full sm:w-auto px-8 font-mono font-semibold border-0"
            style={{ background: "#40B5AD", color: "#040e0e" }}
          >
            <Link to="/auth">{t.landing_try_me as string}</Link>
          </Button>
          <Button
            asChild size="lg"
            className="w-full sm:w-auto font-mono"
            style={{ background: "transparent", color: "#4a8a85", border: "none" }}
          >
            <Link to="/tryout">{t.tryout_button as string}</Link>
          </Button>
        </div>
        <Link
          to="/legal"
          className="text-xs font-mono underline underline-offset-2"
          style={{ color: "#2a5a55" }}
        >
          {t.landing_legal as string}
        </Link>
      </section>
    </div>
  );
};

export default Landing;
