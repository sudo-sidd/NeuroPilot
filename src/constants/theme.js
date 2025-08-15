import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

// Design token definitions (Phase 1 Theme System)
const lightPalette = {
  mode: 'light',
  primary: '#FFB347',
  primaryDark: '#F59A1F',
  secondary: '#6BCB77',
  background: '#FDF8F4',
  backgroundAlt: '#F9F3EF',
  surface: '#FFFFFF',
  surfaceAlt: '#F9F3EF',
  border: '#E6DDD6',
  text: '#1A1A1A',
  textLight: '#665F5A',
  success: '#6BCB77',
  info: '#4D96FF',
  warning: '#FFC94D',
  danger: '#FF5F56',
  focus: '#4D96FF'
};

const darkPalette = {
  mode: 'dark',
  primary: '#FF7B54',
  primaryDark: '#FF6435',
  secondary: '#5BE7A9',
  background: '#0F0F10',
  backgroundAlt: '#1B1C1E',
  surface: '#1B1C1E',
  surfaceAlt: '#242628',
  border: '#2A2C30',
  text: '#F3F3F3',
  textLight: '#9EA3A8',
  success: '#5BE7A9',
  info: '#4DA8DA',
  warning: '#FFC94D',
  danger: '#FF6A60',
  focus: '#4DA8DA'
};

// Shared scale tokens
export const spacing = (n = 1) => 4 * n; // 4pt grid

export const radii = { xs: 4, sm: 6, md: 10, lg: 16, pill: 999 };

export const typography = {
  h1: { fontSize: 26, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: 14, fontWeight: '400' },
  small: (paletteRef) => ({ fontSize: 12, color: paletteRef.textLight }),
  monoTimer: { fontSize: 32, fontWeight: '600', fontVariant: ['tabular-nums'] }
};

export const shadows = {
  card: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
};

// Internal mutable reference so existing imports of `palette` keep working dynamically after ThemeProvider mount.
let currentPalette = lightPalette;

// Proxy so palette.primary etc always resolve to currentPalette
// NOTE: Components still need to re-render to see changes; this is backward compatibility only.
// New code should prefer useTheme().
// eslint-disable-next-line prefer-const
export let palette = new Proxy({}, { get: (_, prop) => currentPalette[prop] });

// Theme assembly helper
const buildTheme = (pal) => ({ palette: pal, spacing, radii, typography: { ...typography, small: typography.small(pal) }, shadows });

// Context
const ThemeContext = createContext({ theme: buildTheme(currentPalette), setMode: () => {}, mode: 'light', toggleMode: () => {} });

export const ThemeProvider = ({ initialMode = 'light', children }) => {
  const [mode, setMode] = useState(initialMode);

  const setModeSafe = useCallback((next) => {
    setMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(m => (m === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = useMemo(() => {
    currentPalette = mode === 'dark' ? darkPalette : lightPalette; // mutate reference for legacy imports
    return buildTheme(currentPalette);
  }, [mode]);

  const value = useMemo(() => ({ theme, setMode: setModeSafe, mode, toggleMode }), [theme, setModeSafe, mode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeMode = () => {
  const { mode, setMode, toggleMode } = useContext(ThemeContext);
  return { mode, setMode, toggleMode };
};

// Backward compatible default export
const theme = buildTheme(currentPalette);
export default theme;

// Diagnostic log
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // eslint-disable-next-line no-console
  console.log('[theme] system initialized with mode', currentPalette.mode);
}
