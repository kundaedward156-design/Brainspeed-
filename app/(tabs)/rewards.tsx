import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { rewardsService } from '@/services/rewards';
import type { Reward } from '@/types';

export default function RewardsScreen() {
  const [list, setList] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await rewardsService.listPublished();
    setList(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Rewards" />
      {loading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState icon="gift-outline" title="No rewards yet" message="Published rewards will appear here." />
      ) : (
        list.map((r) => (
          <View key={r.id} style={styles.card}>
            {r.image_url ? (
              <Image source={{ uri: r.image_url }} style={styles.img} />
            ) : (
              <View style={[styles.img, styles.placeholder]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{r.title}</Text>
              <Text style={styles.amount}>K{r.amount_zmw}</Text>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadows.soft,
  },
  img: { width: 64, height: 64, borderRadius: BorderRadius.md },
  placeholder: { backgroundColor: Colors.surfaceMuted },
  title: { color: Colors.text, fontWeight: '700' },
  amount: { color: Colors.goldDark, fontWeight: '800', marginTop: 4, fontSize: Typography.size.lg },
});
