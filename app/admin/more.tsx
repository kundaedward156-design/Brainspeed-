import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/constants/theme';

const ROWS = [
  { icon: 'swap-vertical-outline' as const, title: 'Deposits & withdrawals', href: '/admin/transactions' },
  { icon: 'link-outline' as const, title: 'Links (Telegram, Privacy Policy…)', href: '/admin/links' },
  { icon: 'megaphone-outline' as const, title: 'Send announcement', href: '/admin/announcements' },
  { icon: 'stats-chart-outline' as const, title: 'Scoring configuration', href: '/admin/settings-scoring' },
  { icon: 'cash-outline' as const, title: 'Fees & entry amount', href: '/admin/settings-fees' },
  { icon: 'construct-outline' as const, title: 'Maintenance mode', href: '/admin/settings-maintenance' },
];

export default function AdminMore() {
  const router = useRouter();
  return (
    <Screen scroll contentStyle={{}}>
      <Header title="More" />
      <Text style={styles.hint}>Payments, links, announcements and app settings.</Text>
      <Card style={styles.card}>
        {ROWS.map((r) => (
          <TouchableOpacity key={r.title} style={styles.row} onPress={() => router.push(r.href as any)}>
            <Ionicons name={r.icon} size={22} color={Colors.primary} />
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
    borderBottomColor: 'Colors.border',
    gap: 12,
  },
  rowTitle: { flex: 1, color: Colors.text, fontWeight: '600' },
});
