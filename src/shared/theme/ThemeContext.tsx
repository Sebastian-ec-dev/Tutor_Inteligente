import React, { createContext, useContext, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

export const appThemes = {
  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceMuted: "#EFF6FF",
    text: "#0F172A",
    muted: "#64748B",
    border: "#E2E8F0",
    navCard: "#FFFFFF",
  },
  dark: {
    background: "#0F172A",
    surface: "#1E293B",
    surfaceMuted: "#172554",
    text: "#F8FAFC",
    muted: "#CBD5E1",
    border: "#334155",
    navCard: "#111827",
  },
};

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof appThemes.light;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  const value = useMemo(() => {
    const isDark = mode === "dark";

    return {
      mode,
      isDark,
      colors: appThemes[mode],
      toggleTheme: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode debe usarse dentro de ThemeProvider");
  }

  return context;
}
