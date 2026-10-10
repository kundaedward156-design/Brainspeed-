import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/constants/theme';

const ROWS = [
  { icon: 'gift-outline' as const, title: 'Rewards', href: '/admin/rewards-manage' },
  { icon: 'people-outline' as const, title: 'View entries', href: '/admin/entries' },
  { icon: 'document-text-outline' as const, title: 'Competition rules', href: '/admin/settings-rules' },
  { icon: 'stats-chart-outline' as const, title: 'Scoring configuration', href: '/admin/settings-scoring' },
  { icon: 'construct-outline' as const, title: 'Maintenance mode', href: '/admin/settings-maintenance' },
];

export default function AdminMore() {
  const router = useRouter();
  return (
    <Screen scroll contentStyle={{}}>
      <Header title="More" />
      <Text style={styles.hint}>Rewards, entries, and app settings.</Text>
      <Card style={styles.card}>
        {ROWS.map((r) => (
          <TouchableOpacity key={r.title} style={styles.row} onPress={() => router.push(r.href as any)}>
            <Ionicons name={r.icon} size={22} color={Colors.gold} />
            <Text style={styles.rowTitle}>{r.title}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textMuted, marginBottom: Spacing.lg, fontSize: Typography.size.sm },
  card: { marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  rowTitle: { flex: 1, color: Colors.text, fontWeight: '600' },
});
