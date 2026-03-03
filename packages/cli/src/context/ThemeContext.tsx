import React, { useState, useCallback } from 'react';
import { THEMES, type Theme } from '@personal-cli/shared';
import { getTheme, setTheme as persistTheme } from '@personal-cli/core';

interface ThemeContextValue {
  theme: Theme;
  setThemeName: (name: string) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: THEMES.default,
  setThemeName: () => {},
});

export function useTheme(): Theme {
  return React.useContext(ThemeContext).theme;
}

export function useSetTheme(): (name: string) => void {
  return React.useContext(ThemeContext).setThemeName;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = getTheme();
    return THEMES[saved] ?? THEMES.default;
  });

  const setThemeName = useCallback((name: string) => {
    const t = THEMES[name];
    if (!t) return;
    setThemeState(t);
    persistTheme(name);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}
