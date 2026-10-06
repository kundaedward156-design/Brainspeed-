import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** When true, wordmark uses dark text for light backgrounds */
  lightBg?: boolean;
}

export function LogoMark({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 88 : size === 'md' ? 48 : 36;
  const font = size === 'lg' ? 42 : size === 'md' ? 24 : 18;
  return (
    <View style={[styles.mark, { width: dim, height: dim, borderRadius: dim * 0.28 }]}>
      <Text style={[styles.letter, { fontSize: font }]}>B</Text>
      <View style={[styles.bolt, size !== 'lg' && { bottom: 8, left: 8, right: 8, height: 2 }]} />
    </View>
  );
}

export function Logo({ size = 'md', lightBg = false }: LogoProps) {
  return (
    <View style={styles.row}>
      <LogoMark size={size === 'lg' ? 'md' : 'sm'} />
      <Text style={[styles.word, lightBg && styles.wordDark, size === 'lg' && { fontSize: 28 }]}>
        Brain<Text style={styles.speed}>speed</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    color: Colors.white,
    fontWeight: '900',
  },
  bolt: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  word: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  wordDark: {
    color: Colors.text,
  },
  speed: {
    color: Colors.gold,
  },
});
