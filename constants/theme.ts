/**
 * Design tokens — Quivanta Quiz.
 * Light, calm surfaces with a deep-violet brand colour taken from the app icon.
 */

export const Colors = {
  // Brand
  primary: '#6A35D0',
  primaryDark: '#4A1FA3',
  primaryDeep: '#2D025B',
  primarySoft: '#EFE9FD',
  primaryMuted: 'rgba(106, 53, 208, 0.10)',
  accent: '#F5A623', // money / trophies
  accentSoft: '#FFF4DC',

  // Surfaces
  background: '#F6F3FF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#EFEBFA',
  border: '#E4DDF5',
  borderStrong: '#CFC4EC',

  // Text
  text: '#1D1244',
  textSecondary: '#5E5683',
  textMuted: '#8D86AE',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success: '#12A05C',
  successMuted: 'rgba(18, 160, 92, 0.12)',
  error: '#D93A3A',
  errorMuted: 'rgba(217, 58, 58, 0.10)',
  warning: '#D98A0B',
  warningMuted: 'rgba(217, 138, 11, 0.12)',
  info: '#2B6CE0',

  overlay: 'rgba(29, 18, 68, 0.55)',
  white: '#FFFFFF',
  whiteMuted: 'rgba(255, 255, 255, 0.78)',
  whiteDim: 'rgba(255, 255, 255, 0.5)',
  whiteFaint: 'rgba(255, 255, 255, 0.14)',

  // ── Legacy aliases (admin screens written against the old dark theme) ──
  gold: '#6A35D0',
  goldLight: '#8B5CF0',
  goldDark: '#4A1FA3',
  goldMuted: 'rgba(106, 53, 208, 0.10)',
  navy: '#2D025B',
  navyDeep: '#1D1244',
  navyLight: '#4A1FA3',
  navyCard: '#FFFFFF',
  navyElevated: '#FFFFFF',
  blue: '#2B6CE0',
  blueDark: '#1F52B3',
  blueEnergy: '#2B6CE0',
  blueMuted: 'rgba(43, 108, 224, 0.12)',
  orange: '#F5A623',
  orangeLight: '#F8BC57',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const Typography = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 34,
    hero: 40,
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#2D025B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  button: {
    shadowColor: '#4A1FA3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  soft: {
    shadowColor: '#2D025B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
} as const;
