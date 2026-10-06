/**
 * Brainspeed Design System
 * Splash: deep navy + gold energy
 * App screens: clean white / light surfaces (matches product screenshots)
 */

export const Colors = {
  // Brand
  navy: '#0A1628',
  navyDeep: '#06101F',
  navyLight: '#12253F',
  blue: '#1E6FFF',
  blueDark: '#0D4FCC',
  blueEnergy: '#2B7BFF',
  gold: '#F5C518',
  goldLight: '#FFD54F',
  goldDark: '#D4A017',

  // Light app surfaces (primary UI after login)
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F8',
  border: '#E5EAF2',
  borderStrong: '#D0D7E4',

  // Text on light
  text: '#0A1628',
  textSecondary: '#5A6A85',
  textMuted: '#8B97AB',
  textInverse: '#FFFFFF',

  // Text on dark (splash)
  white: '#FFFFFF',
  whiteMuted: 'rgba(255, 255, 255, 0.75)',
  whiteDim: 'rgba(255, 255, 255, 0.45)',

  // Semantic
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.12)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.1)',
  warning: '#F59E0B',

  // Accents on light
  goldMuted: 'rgba(245, 197, 24, 0.18)',
  blueMuted: 'rgba(30, 111, 255, 0.12)',
  navyCard: '#152A45',
  navyElevated: '#1A3352',
  whiteFaint: 'rgba(255, 255, 255, 0.12)',
  overlay: 'rgba(10, 22, 40, 0.55)',
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
  xxl: 24,
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
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: '#D4A017',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  soft: {
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
