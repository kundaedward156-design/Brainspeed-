import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'gold' | 'blue' | 'success' | 'error' | 'muted';
}

export function Badge({ label, variant = 'gold' }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant]]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  gold: { backgroundColor: Colors.goldMuted },
  blue: { backgroundColor: Colors.blueMuted },
  success: { backgroundColor: Colors.successMuted },
  error: { backgroundColor: Colors.errorMuted },
  muted: { backgroundColor: Colors.surfaceMuted },
  text: { fontSize: Typography.size.xs, fontWeight: '700' },
  text_gold: { color: Colors.goldDark },
  text_blue: { color: Colors.blue },
  text_success: { color: Colors.success },
  text_error: { color: Colors.error },
  text_muted: { color: Colors.textSecondary },
});
