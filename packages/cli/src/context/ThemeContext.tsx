import React from 'react';
import { THEMES, type Theme } from '@personal-cli/shared';

export const ThemeContext = React.createContext<Theme>(THEMES.default);

export function useTheme(): Theme {
  return React.useContext(ThemeContext);
}
