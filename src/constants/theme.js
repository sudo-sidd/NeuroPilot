export const palette = {
  primary: '#2563EB',
  primaryDark: '#1E3A8A',
  secondary: '#F59E0B',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  textLight: '#64748B',
  success: '#16A34A',
  danger: '#DC2626'
};

export const spacing = (n = 1) => 4 * n;

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16
};

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: 14 },
  small: { fontSize: 12, color: palette.textLight }
};

export const shadows = {
  card: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
};

// Diagnostic log (dev only) to confirm module evaluation
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[theme] loaded. palette keys:', Object.keys(palette));
}

// Provide default export for any default import usage
const theme = { palette, spacing, radii, typography, shadows };
export default theme;
