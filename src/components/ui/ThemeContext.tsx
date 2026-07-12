import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getCloudUserPreferences, saveCloudUserPreferences } from '../../infrastructure/supabase/SupabaseUserPreferences';

const STORAGE_KEY = 'APP_THEME_MODE';

export type AppThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: AppThemeMode;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    card: string;
    soft: string;
    input: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
    primarySoft: string;
    purple: string;
    danger: string;
    success: string;
    chip: string;
  };
  setMode: (mode: AppThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
};

const lightColors = {
  // Fondo azul muy suave y tarjetas blancas para que cada bloque se distinga
  // sin convertir la interfaz en algo demasiado saturado.
  background: '#F3F6FC',
  surface: '#FBFDFF',
  card: '#FFFFFF',
  soft: '#E8EFFA',
  input: '#F5F8FD',
  border: '#C8D5E8',
  text: '#0F172A',
  muted: '#5B6B82',
  primary: '#2563EB',
  primarySoft: '#E1ECFF',
  purple: '#7C3AED',
  danger: '#EF4444',
  success: '#16A34A',
  chip: '#ECF2FB',
};

const darkColors = {
  background: '#0B1426',
  surface: '#111C31',
  card: '#18253B',
  soft: '#20304A',
  input: '#0D1728',
  border: '#40516D',
  text: '#F8FAFC',
  muted: '#C3CEE0',
  primary: '#60A5FA',
  primarySoft: '#1B3D73',
  purple: '#A78BFA',
  danger: '#F87171',
  success: '#4ADE80',
  chip: '#17243A',
};

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>('light');

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => {
        if (active && (value === 'dark' || value === 'light')) setModeState(value);
      })
      .catch(() => undefined);

    getCloudUserPreferences()
      .then((prefs) => {
        if (active && prefs) {
          setModeState(prefs.themeMode);
          SecureStore.setItemAsync(STORAGE_KEY, prefs.themeMode).catch(() => undefined);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const setMode = async (nextMode: AppThemeMode) => {
    setModeState(nextMode);
    await SecureStore.setItemAsync(STORAGE_KEY, nextMode);
    await saveCloudUserPreferences({ themeMode: nextMode }).catch(() => undefined);
  };

  const toggleMode = async () => {
    await setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo<AppTheme>(() => {
    const isDark = mode === 'dark';
    return {
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
      setMode,
      toggleMode,
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme debe usarse dentro de ThemeProvider');
  }
  return theme;
}
