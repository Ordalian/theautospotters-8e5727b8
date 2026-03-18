import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getSafeLocalStorage } from "@/lib/browserStorage";
import fr from "./translations/fr";
import type { Translations } from "./translations/fr";
import en from "./translations/en";

export type Language = "fr" | "en";

const translationsMap: Record<Language, Translations> = { fr, en };
const LANGUAGE_STORAGE_KEY = "app_language";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLang] = useState<Language>(() => {
    const stored = getSafeLocalStorage().getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    return stored === "en" ? "en" : "fr";
  });

  // Load language from profile on login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("language")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const lang = (data as any)?.language as Language | undefined;
        if (lang && (lang === "fr" || lang === "en")) {
          setLang(lang);
          getSafeLocalStorage().setItem(LANGUAGE_STORAGE_KEY, lang);
        }
      });
  }, [user]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLang(lang);
    getSafeLocalStorage().setItem(LANGUAGE_STORAGE_KEY, lang);
    if (user) {
      await supabase
        .from("profiles")
        .update({ language: lang } as any)
        .eq("user_id", user.id);
    }
  }, [user]);

  const t = translationsMap[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

const fallback: LanguageContextType = {
  language: "fr",
  setLanguage: async () => {},
  t: fr,
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context ?? fallback;
}
