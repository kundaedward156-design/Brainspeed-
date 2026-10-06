import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.88}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.navy : Colors.gold}
          size="small"
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  primary: {
    backgroundColor: Colors.gold,
    ...Shadows.button,
  },
  secondary: { backgroundColor: Colors.blue },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },
  disabled: { opacity: 0.5 },
  size_sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, minHeight: 40 },
  size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, minHeight: 52 },
  size_lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, minHeight: 56 },
  text: { fontWeight: '700', letterSpacing: 0.2 },
  text_primary: { color: Colors.navy },
  text_secondary: { color: Colors.white },
  text_outline: { color: Colors.goldDark },
  text_ghost: { color: Colors.textSecondary },
  text_danger: { color: Colors.white },
  textSize_sm: { fontSize: Typography.size.sm },
  textSize_md: { fontSize: Typography.size.md },
  textSize_lg: { fontSize: Typography.size.lg },
});
