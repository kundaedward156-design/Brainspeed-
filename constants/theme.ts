/**
 * Brainspeed Design System — Dark UI matching product screenshots
 * Deep black/navy + gold-orange energy accents
 */

export const Colors = {
  // Brand
  navy: '#0A0A0A',
  navyDeep: '#000000',
  navyLight: '#1A1A1A',
  blue: '#1E6FFF',
  blueDark: '#0D4FCC',
  blueEnergy: '#2B7BFF',
  gold: '#F5C518',
  goldLight: '#FFD54F',
  goldDark: '#D4A017',
  orange: '#F97316',
  orangeLight: '#FB923C',

  // Dark app surfaces
  background: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1C1C1C',
  surfaceMuted: '#1F1F1F',
  border: '#2A2A2A',
  borderStrong: '#3A3A3A',

  // Text on dark
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#6B6B6B',
  textInverse: '#0A0A0A',

  // Aliases for compatibility
  white: '#FFFFFF',
  whiteMuted: 'rgba(255, 255, 255, 0.75)',
  whiteDim: 'rgba(255, 255, 255, 0.45)',

  // Semantic
  success: '#22C55E',
  successMuted: 'rgba(34, 197, 94, 0.15)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',

  // Accents
  goldMuted: 'rgba(245, 197, 24, 0.18)',
  blueMuted: 'rgba(30, 111, 255, 0.12)',
  navyCard: '#141414',
  navyElevated: '#1C1C1C',
  whiteFaint: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.7)',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: '#D4A017',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
