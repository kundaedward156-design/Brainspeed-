import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
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
  icon?: keyof typeof Ionicons.glyphMap;
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
  icon,
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
          color={variant === 'primary' || variant === 'danger' || variant === 'secondary' ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={TEXT_COLOR[variant]}
              style={{ marginRight: 8 }}
            />
          ) : null}
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {title}
        </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const TEXT_COLOR: Record<Variant, string> = {
  primary: Colors.white,
  secondary: Colors.white,
  outline: Colors.primary,
  ghost: Colors.textSecondary,
  danger: Colors.white,
  soft: Colors.primary,
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  primary: {
    backgroundColor: Colors.primary,
    ...Shadows.button,
  },
  secondary: { backgroundColor: Colors.primaryDeep },
  soft: { backgroundColor: Colors.primarySoft },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },
  disabled: { opacity: 0.5 },
  size_sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, minHeight: 40 },
  size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, minHeight: 52 },
  size_lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, minHeight: 56 },
  text: { fontWeight: '700', letterSpacing: 0.2 },
  text_primary: { color: Colors.white },
  text_soft: { color: Colors.primary },
  text_secondary: { color: Colors.white },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.textSecondary },
  text_danger: { color: Colors.white },
  textSize_sm: { fontSize: Typography.size.sm },
  textSize_md: { fontSize: Typography.size.md },
  textSize_lg: { fontSize: Typography.size.lg },
});
