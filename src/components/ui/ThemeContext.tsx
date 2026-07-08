import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

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
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  soft: '#EEF2FF',
  input: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#2563EB',
  primarySoft: '#EFF6FF',
  purple: '#7C3AED',
  danger: '#EF4444',
  success: '#16A34A',
  chip: '#F8FAFC',
};

const darkColors = {
  background: '#0F172A',
  surface: '#111827',
  card: '#1E293B',
  soft: '#1E293B',
  input: '#0B1220',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#CBD5E1',
  primary: '#60A5FA',
  primarySoft: '#1E3A8A',
  purple: '#A78BFA',
  danger: '#F87171',
  success: '#4ADE80',
  chip: '#172033',
};

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>('light');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => {
        if (value === 'dark' || value === 'light') {
          setModeState(value);
        }
      })
      .catch(() => undefined);
  }, []);

  const setMode = useCallback(async (nextMode: AppThemeMode) => {
    setModeState(nextMode);
    await SecureStore.setItemAsync(STORAGE_KEY, nextMode);
  }, []);

  const toggleMode = useCallback(async () => {
    await setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo<AppTheme>(() => {
    const isDark = mode === 'dark';
    return {
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
      setMode,
      toggleMode,
    };
  }, [mode, setMode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme debe usarse dentro de ThemeProvider');
  }
  return theme;
}
