import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import type { Competition } from '@/types';

export default function CompeteScreen() {
  const router = useRouter();
  const [list, setList] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await competitionsService.listActive();
    setList(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Compete" />
      <Text style={styles.hint}>Join a quiz competition and climb the leaderboard.</Text>
      {loading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState icon="flash-outline" title="No active quizzes" message="New competitions will show up here." />
      ) : (
        list.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            onPress={() => router.push(`/competition/${c.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.icon}>
              <Ionicons name="flash" size={22} color={Colors.goldDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.meta}>
                {c.reward != null ? `Reward: ${c.reward}` : 'Quiz'}
                {c.category?.name ? ` · ${c.category.name}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textSecondary, marginBottom: Spacing.lg, fontSize: Typography.size.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  title: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  meta: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 3 },
});
