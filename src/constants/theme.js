import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { getPreference } from '../services/Database';

// Design token definitions (Phase 1 Theme System)
const lightPalette = {
  mode: 'light',
  primary: '#FFD166', // warm gold
  primaryDark: '#E6B851',
  secondary: '#6BCB77', // fresh green
  tertiary: '#6BCB77', // alias (not distinct in light)
  background: '#FAF9F6',
  backgroundAlt: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F9F3EF',
  border: '#E6DDD6',
  text: '#1C1C1C',
  textLight: '#5E5E5E',
  success: '#6BCB77',
  info: '#4D96FF',
  warning: '#FFD166',
  danger: '#FF5F56',
  focus: '#4D96FF',
  gradient: ['#FAF9F6','#F9D1E4','#D3E4FD']
};

const darkPalette = {
  mode: 'dark',
  primary: '#FF6B6B', // neon coral
  primaryDark: '#E65555',
  secondary: '#4ECDC4',
  tertiary: '#FFE66D',
  background: '#0B0C10',
  backgroundAlt: '#1F1B24',
  surface: '#1F1B24',
  surfaceAlt: '#27222E',
  border: '#2F2835',
  text: '#F5F5F5',
  textLight: '#B9B9B9',
  success: '#4ECDC4',
  info: '#4DA8DA',
  warning: '#FFE66D',
  danger: '#FF6B6B',
  focus: '#4DA8DA',
  gradient: ['#0B0C10','#14161C','#1F1B24']
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
let currentPalette = darkPalette; // default to dark mode by default

// Proxy so palette.primary etc always resolve to currentPalette
// NOTE: Components still need to re-render to see changes; this is backward compatibility only.
// New code should prefer useTheme().
// eslint-disable-next-line prefer-const
export let palette = new Proxy({}, { get: (_, prop) => currentPalette[prop] });

// Theme assembly helper
const buildTheme = (pal) => ({ palette: pal, spacing, radii, typography: { ...typography, small: typography.small(pal) }, shadows });

// Context
const ThemeContext = createContext({ theme: buildTheme(currentPalette), setMode: () => {}, mode: 'light', toggleMode: () => {}, reducedMotion: false, setReducedMotion: () => {}, toggleReducedMotion: () => {} });

export const ThemeProvider = ({ initialMode = 'dark', children, initialReducedMotion = false }) => {
  const [mode, setMode] = useState(initialMode);
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedMode = await getPreference('theme_mode');
        const savedMotion = await getPreference('reduced_motion');
        if (mounted) {
          if (savedMode && (savedMode === 'light' || savedMode === 'dark')) setMode(savedMode);
          if (savedMotion === '1') setReducedMotion(true);
          setHydrated(true);
        }
      } catch { setHydrated(true); }
    })();
    return () => { mounted = false; };
  }, []);

  const setModeSafe = useCallback((next) => { setMode(next); }, []);
  const toggleMode = useCallback(() => { setMode(m => (m === 'light' ? 'dark' : 'light')); }, []);
  const toggleReducedMotion = useCallback(() => { setReducedMotion(v => !v); }, []);

  const theme = useMemo(() => {
    currentPalette = mode === 'dark' ? darkPalette : lightPalette; // mutate reference for legacy imports
    return buildTheme(currentPalette);
  }, [mode]);

  const value = useMemo(() => ({ theme, setMode: setModeSafe, mode, toggleMode, reducedMotion, setReducedMotion, toggleReducedMotion }), [theme, setModeSafe, mode, toggleMode, reducedMotion]);

  return <ThemeContext.Provider value={value}>{hydrated ? children : null}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeMode = () => {
  const { mode, setMode, toggleMode, reducedMotion, setReducedMotion, toggleReducedMotion } = useContext(ThemeContext);
  return { mode, setMode, toggleMode, reducedMotion, setReducedMotion, toggleReducedMotion };
};

// Backward compatible default export
const theme = buildTheme(currentPalette);
export default theme;

// Diagnostic log
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // eslint-disable-next-line no-console
  console.log('[theme] system initialized with mode', currentPalette.mode);
}
