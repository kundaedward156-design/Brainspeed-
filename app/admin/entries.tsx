import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import type { Competition, CompetitionEntry } from '@/types';

export default function AdminEntries() {
  const [quizzes, setQuizzes] = useState<Competition[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<CompetitionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await competitionsService.listAll();
    setQuizzes(res.data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pick = async (id: string) => {
    setSelected(id);
    const res = await competitionsService.listEntries(id);
    setEntries(res.data);
  };

  return (
    <Screen
      scroll
      contentStyle={{}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
    >
      <Header title="Entries" showBack />
      <Text style={styles.hint}>Select a competition to view scores.</Text>
      <View style={styles.chips}>
        {quizzes.map((q) => (
          <TouchableOpacity
            key={q.id}
            style={[styles.chip, selected === q.id && styles.chipOn]}
            onPress={() => pick(q.id)}
          >
            <Text style={styles.chipText} numberOfLines={1}>{q.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <LoadingState />
      ) : !selected ? (
        <EmptyState icon="list-outline" title="Pick a quiz" message="Choose a competition above." />
      ) : entries.length === 0 ? (
        <EmptyState icon="people-outline" title="No entries" message="No one has joined yet." />
      ) : (
        entries.map((e, i) => (
          <View key={`${e.user_id}-${i}`} style={styles.row}>
            <Text style={styles.rank}>{i + 1}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {e.profiles?.full_name || e.profiles?.email || e.user_id}
            </Text>
            <Text style={styles.score}>{e.score}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textMuted, marginBottom: Spacing.md, fontSize: Typography.size.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipOn: { backgroundColor: Colors.gold },
  chipText: { color: Colors.text, fontWeight: '600', fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  rank: { width: 28, color: Colors.gold, fontWeight: '800' },
  name: { flex: 1, color: Colors.white },
  score: { color: Colors.gold, fontWeight: '800', fontSize: Typography.size.lg },
});
