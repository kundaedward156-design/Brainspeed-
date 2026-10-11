import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { quizzesService } from '@/services/quizzes';
import { competitionsService } from '@/services/competitions';
import { useAuth } from '@/contexts/AuthContext';
import type { Quiz } from '@/types';

export default function CompeteScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [list, setList] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (profile?.id) {
      const res = await competitionsService.listAvailableQuizzes(profile.id);
      setList(res.data);
    } else {
      const res = await quizzesService.listActive();
      setList(res.data);
    }
    setLoading(false);
  }, [profile?.id]);

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
            onPress={async () => {
              if (!profile?.id) return;
              const fee = Number((c as any).entry_fee_zmw || 22);
              const { data, error } = await competitionsService.findOrCreateMatch(c.id, profile.id, fee);
              if (error || !data) {
                Alert.alert('Cannot join', error || 'Try again');
                return;
              }
              router.push(`/competition/${data.id}`);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.icon}>
              <Ionicons name="flash" size={22} color={Colors.goldDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.meta}>
                `Entry: K${(c as any).entry_fee_zmw ?? 0}`
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
