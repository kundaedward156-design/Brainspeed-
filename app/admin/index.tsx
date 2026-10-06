import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { adminService, type AdminStats } from '@/services/admin';

const STAT_KEYS: { key: keyof AdminStats; label: string }[] = [
  { key: 'total_users', label: 'Total users' },
  { key: 'active_users', label: 'Active users' },
  { key: 'competitions', label: 'Competitions' },
  { key: 'completed_competitions', label: 'Completed' },
  { key: 'questions', label: 'Questions' },
  { key: 'active_banners', label: 'Active banners' },
  { key: 'rewards', label: 'Rewards' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminService.getStats().then((res) => setStats(res.data));
  }, []);

  return (
    <Screen scroll>
      <Header title="Admin" showBack onBack={() => router.back()} />
      <Text style={styles.badge}>MANAGEMENT</Text>
      <Text style={styles.sub}>Live overview of Brainspeed activity.</Text>
      <View style={styles.grid}>
        {STAT_KEYS.map(({ key, label }) => (
          <Card key={key} style={styles.statCard}>
            <Text style={styles.statValue}>{stats ? stats[key] : '—'}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    color: Colors.goldDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginBottom: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statCard: { width: '47%', alignItems: 'flex-start' },
  statValue: { color: Colors.goldDark, fontSize: Typography.size.xxl, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 4 },
});
