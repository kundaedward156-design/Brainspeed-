import React from 'react';
import { View, Text, StyleSheet, Image, ImageStyle, ViewStyle } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** When true, wordmark uses dark text for light backgrounds */
  lightBg?: boolean;
  /** Show only the mark (image), no wordmark */
  markOnly?: boolean;
}

const SIZE_MAP = {
  sm: 36,
  md: 56,
  lg: 96,
  xl: 140,
} as const;

export function LogoMark({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dim = SIZE_MAP[size] ?? 96;
  return (
    <Image
      source={require('@/assets/logo.png')}
      style={{ width: dim, height: dim } as ImageStyle}
      resizeMode="contain"
    />
  );
}

export function Logo({ size = 'md', lightBg = false, markOnly = false }: LogoProps) {
  if (markOnly) {
    return <LogoMark size={size} />;
  }

  const markSize = size === 'xl' ? 'lg' : size === 'lg' ? 'md' : 'sm';
  const wordSize = size === 'xl' ? 32 : size === 'lg' ? 28 : size === 'md' ? 22 : 18;

  return (
    <View style={styles.row}>
      <LogoMark size={markSize} />
      <Text style={[styles.word, lightBg && styles.wordDark, { fontSize: wordSize }]}>
        Brain<Text style={styles.speed}>speed</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  word: {
    color: Colors.white,
    fontWeight: '800',
  },
  wordDark: {
    color: Colors.text,
  },
  speed: {
    color: Colors.gold,
  },
});
