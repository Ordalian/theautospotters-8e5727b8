import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId = "noir-or" | "bleu-alpine" | "rose-barbie" | "vert-rallye" | "glace-arctique";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  preview: { bg: string; accent: string; text: string };
}

export const THEMES: ThemeOption[] = [
  { id: "noir-or", label: "Noir et Or", preview: { bg: "#0d0d0d", accent: "#d4af37", text: "#f0ede5" } },
  { id: "bleu-alpine", label: "Bleu Alpine", preview: { bg: "#0a1628", accent: "#2e6bc6", text: "#e0eaf5" } },
  { id: "rose-barbie", label: "Rose Barbie", preview: { bg: "#1a0a14", accent: "#e84393", text: "#f8e8f0" } },
  { id: "vert-rallye", label: "Vert Rallye", preview: { bg: "#0a1a0e", accent: "#27ae60", text: "#e0f5e8" } },
  { id: "glace-arctique", label: "Glace Arctique", preview: { bg: "#0c1520", accent: "#5bc0de", text: "#e8f4f8" } },
];

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: "noir-or", setTheme: () => {} });

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem("app-theme") as ThemeId) || "noir-or";
  });

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
