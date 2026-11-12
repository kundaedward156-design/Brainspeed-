import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface LinkRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
  tint?: string;
}

export function LinkRow({ icon, label, hint, onPress, last, tint = Colors.primary }: LinkRowProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.row, !last && styles.divider]}>
      <View style={[styles.icon, { backgroundColor: Colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '600' },
  hint: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
});
