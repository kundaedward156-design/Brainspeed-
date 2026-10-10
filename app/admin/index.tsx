import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { adminService, type AdminStats } from '@/services/admin';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminService.getStats();
    setStats(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !stats) {
    return (
      <Screen>
        <Header title="Admin" />
        <LoadingState />
      </Screen>
    );
  }

  const tiles = [
    { label: 'Users', value: stats?.total_users ?? 0 },
    { label: 'Quizzes', value: stats?.competitions ?? 0 },
    { label: 'Questions', value: stats?.questions ?? 0 },
    { label: 'Entries', value: stats?.entries ?? 0 },
    { label: 'Banners', value: stats?.active_banners ?? 0 },
    { label: 'Rewards', value: stats?.rewards ?? 0 },
  ];

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Admin Dashboard" />
      <View style={styles.grid}>
        {tiles.map((t) => (
          <Card key={t.label} style={styles.tile}>
            <Text style={styles.value}>{t.value}</Text>
            <Text style={styles.label}>{t.label}</Text>
          </Card>
        ))}
      </View>
      <Button title="Manage Content" onPress={() => router.push('/admin/content')} fullWidth style={{ marginBottom: Spacing.md }} />
      <Button title="Create Quiz" variant="outline" onPress={() => router.push('/admin/quizzes')} fullWidth style={{ marginBottom: Spacing.md }} />
      <Button title="View Entries" variant="ghost" onPress={() => router.push('/admin/entries')} fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  tile: { width: '47%', alignItems: 'center', paddingVertical: Spacing.lg },
  value: { color: Colors.gold, fontSize: Typography.size.xxl, fontWeight: '800' },
  label: { color: Colors.textSecondary, marginTop: 4, fontSize: Typography.size.sm },
});
