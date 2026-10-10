import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import type { Competition } from '@/types';

export default function AdminCompetitions() {
  const router = useRouter();
  const [list, setList] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await competitionsService.listAll();
    setList(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Quizzes" />
      <Button title="Create Quiz" onPress={() => router.push('/admin/quizzes')} fullWidth style={{ marginBottom: Spacing.lg }} />
      {loading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState icon="flash-outline" title="No quizzes" message="Create your first quiz." />
      ) : (
        list.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.row}
            onPress={() => router.push('/admin/questions')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.meta}>Reward: {c.reward ?? '—'} · {c.category?.name || 'No category'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  title: { color: Colors.text, fontWeight: '700' },
  meta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2 },
});
