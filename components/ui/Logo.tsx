import React from 'react';
import { View, Text, Image, StyleSheet, ImageStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Kept for backwards compatibility — the wordmark now always adapts to the light theme. */
  lightBg?: boolean;
  markOnly?: boolean;
}

const SIZE_MAP = { sm: 36, md: 56, lg: 96, xl: 140 } as const;

export function LogoMark({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dim = SIZE_MAP[size] ?? 96;
  return (
    <Image
      source={require('@/assets/logo.png')}
      style={{ width: dim, height: dim * 1.06 } as ImageStyle}
      resizeMode="contain"
    />
  );
}

export function Logo({ size = 'md', markOnly = false }: LogoProps) {
  if (markOnly) return <LogoMark size={size} />;
  const markSize = size === 'xl' ? 'lg' : size === 'lg' ? 'md' : 'sm';
  const wordSize = size === 'xl' ? 30 : size === 'lg' ? 26 : size === 'md' ? 20 : 16;
  return (
    <View style={styles.row}>
      <LogoMark size={markSize} />
      <Text style={[styles.word, { fontSize: wordSize }]}>
        QUIVANTA <Text style={styles.quiz}>Quiz</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { color: Colors.primaryDeep, fontWeight: '900', letterSpacing: 0.4 },
  quiz: { color: Colors.primary },
});
