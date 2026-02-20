import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId = "noir-or" | "bleu-alpine" | "rose-barbie" | "vert-rallye" | "glace-arctique";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  preview: { bg: string; accent: string; text: string };
}

export const THEMES: ThemeOption[] = [
  { id: "noir-or", label: "Noir et Or", preview: { bg: "#0d0d0d", accent: "#d4af37", text: "#f5f0e0" } },
  { id: "bleu-alpine", label: "Bleu Alpine", preview: { bg: "#050a18", accent: "#2864dc", text: "#c8deff" } },
  { id: "rose-barbie", label: "Rose Barbie", preview: { bg: "#10050a", accent: "#c8147e", text: "#ffd0ea" } },
  { id: "vert-rallye", label: "Vert Rallye", preview: { bg: "#040d06", accent: "#1db954", text: "#c8ffd8" } },
  { id: "glace-arctique", label: "Glace Arctique", preview: { bg: "#060e18", accent: "#40d8e0", text: "#d0f8ff" } },
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
