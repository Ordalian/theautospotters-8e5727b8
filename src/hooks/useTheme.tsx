import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getSafeLocalStorage } from "@/lib/browserStorage";

export type ThemeId =
  | "noir-or"
  | "bleu-alpine"
  | "rose-barbie"
  | "vert-rallye"
  | "glace-arctique"
  | "ferrari-red"
  | "style-midnight"
  | "style-sakura"
  | "style-aurora"
  | "style-sunset"
  | "style-forest"
  | "style-ocean"
  | "style-neon"
  | "style-gold"
  | "style-cyber"
  | "style-cosmic";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  preview: { bg: string; accent: string; text: string };
  price?: number;
}

export const THEMES: ThemeOption[] = [
  { id: "noir-or", label: "Noir et Or", preview: { bg: "#0d0d0d", accent: "#d4af37", text: "#f5f0e0" } },
  { id: "bleu-alpine", label: "Bleu Alpine", preview: { bg: "#050a18", accent: "#2864dc", text: "#c8deff" } },
  { id: "rose-barbie", label: "Rose Barbie", preview: { bg: "#10050a", accent: "#c8147e", text: "#ffd0ea" } },
  { id: "vert-rallye", label: "Vert Rallye", preview: { bg: "#040d06", accent: "#1db954", text: "#c8ffd8" } },
  { id: "glace-arctique", label: "Glace Arctique", preview: { bg: "#060e18", accent: "#40d8e0", text: "#d0f8ff" } },
  { id: "ferrari-red", label: "Ferrari Red", preview: { bg: "#0d0505", accent: "#dc2626", text: "#ffd6d6" } },
];

export const PAID_STYLES: ThemeOption[] = [
  { id: "style-midnight", label: "Minuit", preview: { bg: "#050510", accent: "#6366f1", text: "#c7d2fe" }, price: 50 },
  { id: "style-sakura", label: "Sakura", preview: { bg: "#1a0a12", accent: "#ec4899", text: "#fce7f3" }, price: 50 },
  { id: "style-aurora", label: "Aurore", preview: { bg: "#051510", accent: "#10b981", text: "#a7f3d0" }, price: 50 },
  { id: "style-sunset", label: "Sunset", preview: { bg: "#0f0505", accent: "#f97316", text: "#ffedd5" }, price: 50 },
  { id: "style-forest", label: "Forêt", preview: { bg: "#040d08", accent: "#22c55e", text: "#bbf7d0" }, price: 50 },
  { id: "style-ocean", label: "Océan", preview: { bg: "#050f18", accent: "#0ea5e9", text: "#bae6fd" }, price: 50 },
  { id: "style-neon", label: "Neon", preview: { bg: "#0a0510", accent: "#a855f7", text: "#e9d5ff" }, price: 80 },
  { id: "style-gold", label: "Or", preview: { bg: "#0d0a05", accent: "#eab308", text: "#fef9c3" }, price: 80 },
  { id: "style-cyber", label: "Cyber", preview: { bg: "#050510", accent: "#06b6d4", text: "#cffafe" }, price: 80 },
  { id: "style-cosmic", label: "Cosmos", preview: { bg: "#080510", accent: "#8b5cf6", text: "#ede9fe" }, price: 80 },
];

const FREE_THEME_IDS: ThemeId[] = ["noir-or", "bleu-alpine", "rose-barbie", "vert-rallye", "glace-arctique", "ferrari-red"];
const PAID_STYLE_IDS: ThemeId[] = PAID_STYLES.map((s) => s.id);
const ALL_THEME_IDS: ThemeId[] = [...FREE_THEME_IDS, ...PAID_STYLE_IDS];
const THEME_STORAGE_KEY = "app-theme";

function isValidTheme(t: string | null, ownedStyleIds?: Set<string>): t is ThemeId {
  if (t == null) return false;
  if (FREE_THEME_IDS.includes(t as ThemeId)) return true;
  if (PAID_STYLE_IDS.includes(t as ThemeId) && ownedStyleIds?.has(t)) return true;
  return false;
}

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  ownedStyleIds: Set<string>;
  coins: number;
  refetchOwned: () => Promise<void>;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "noir-or",
  setTheme: () => {},
  ownedStyleIds: new Set(),
  coins: 0,
  refetchOwned: async () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (getSafeLocalStorage().getItem(THEME_STORAGE_KEY) as ThemeId) || "noir-or";
  });
  const [ownedStyleIds, setOwnedStyleIds] = useState<Set<string>>(new Set());
  const [coins, setCoins] = useState(0);

  const refetchOwned = async () => {
    if (!user?.id) return;
    const [profileRes, stylesRes] = await Promise.all([
      supabase.from("profiles").select("theme, coins").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_owned_styles").select("style_id").eq("user_id", user.id),
    ]);
    const owned = new Set((stylesRes.data ?? []).map((r) => r.style_id));
    setOwnedStyleIds(owned);
    setCoins(profileRes.data?.coins ?? 0);
    const profileTheme = profileRes.data?.theme;
    if (profileTheme && isValidTheme(profileTheme, owned)) {
      setThemeState(profileTheme);
      getSafeLocalStorage().setItem(THEME_STORAGE_KEY, profileTheme);
    }
  };

  // Load theme + owned styles + coins when user is logged in
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [profileRes, stylesRes] = await Promise.all([
        supabase.from("profiles").select("theme, coins").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_owned_styles").select("style_id").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const owned = new Set((stylesRes.data ?? []).map((r) => r.style_id));
      setOwnedStyleIds(owned);
      setCoins(profileRes.data?.coins ?? 0);
      const profileTheme = profileRes.data?.theme;
      if (profileTheme && isValidTheme(profileTheme, owned)) {
        setThemeState(profileTheme);
        getSafeLocalStorage().setItem(THEME_STORAGE_KEY, profileTheme);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const setTheme = (t: ThemeId) => {
    const canUse = FREE_THEME_IDS.includes(t) || ownedStyleIds.has(t);
    if (!canUse) return;
    setThemeState(t);
    getSafeLocalStorage().setItem(THEME_STORAGE_KEY, t);
    if (user?.id) {
      supabase.from("profiles").update({ theme: t }).eq("user_id", user.id).then(() => {});
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, ownedStyleIds, coins, refetchOwned }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
