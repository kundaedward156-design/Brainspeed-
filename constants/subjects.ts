/**
 * How a subject (category) looks as a card: a cover image if the admin uploaded one,
 * otherwise a coloured tile with an icon. Colours come from the admin's choice or a stable pick.
 */
import type { Ionicons } from '@expo/vector-icons';
import type { Category } from '@/types';

export type IconName = keyof typeof Ionicons.glyphMap;

/** [start, end] gradient pairs the admin can choose from. */
export const ACCENTS: { key: string; colors: [string, string] }[] = [
  { key: '#6A35D0', colors: ['#8B5CF0', '#4A1FA3'] },
  { key: '#2B6CE0', colors: ['#4F8CF5', '#1F52B3'] },
  { key: '#12A05C', colors: ['#2FC27B', '#0B7A45'] },
  { key: '#E0572B', colors: ['#F47A4F', '#B93E17'] },
  { key: '#D4379B', colors: ['#EE5FB9', '#A31F74'] },
  { key: '#D98A0B', colors: ['#F5B03D', '#A86A00'] },
  { key: '#0F9DB0', colors: ['#3CC4D6', '#0A6F7E'] },
  { key: '#5B6475', colors: ['#7D8799', '#3F4756'] },
];

/** Icons the admin can pick for a subject. */
export const SUBJECT_ICONS: IconName[] = [
  'flask-outline', 'calculator-outline', 'globe-outline', 'book-outline', 'language-outline',
  'leaf-outline', 'rocket-outline', 'football-outline', 'musical-notes-outline', 'film-outline',
  'earth-outline', 'bulb-outline', 'medkit-outline', 'business-outline', 'cash-outline',
  'hardware-chip-outline', 'color-palette-outline', 'restaurant-outline', 'paw-outline', 'trophy-outline',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function subjectLook(c: Pick<Category, 'id' | 'name' | 'icon' | 'accent'>): { colors: [string, string]; icon: IconName } {
  const chosen = ACCENTS.find((a) => a.key.toLowerCase() === (c.accent || '').toLowerCase());
  const accent = chosen ?? ACCENTS[hash(c.id || c.name) % ACCENTS.length];
  return { colors: accent.colors, icon: ((c.icon as IconName) || SUBJECT_ICONS[hash(c.name) % SUBJECT_ICONS.length]) };
}
