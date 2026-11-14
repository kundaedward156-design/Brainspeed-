/**
 * Play hub — every subject as a card, plus quick match for players who just want a game.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { SubjectGrid } from '@/components/home/SubjectGrid';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { settingsService } from '@/services/settings';
import { useAuth } from '@/contexts/AuthContext';
import { useSubjects } from '@/hooks/useSubjects';
import type { Subject } from '@/types';

const RULES = [
  { icon: 'albums-outline' as const, text: 'Pick a subject. You are matched with another player in that subject.' },
  { icon: 'help-circle-outline' as const, text: '10 questions, the same for both players, with four answer choices.' },
  { icon: 'timer-outline' as const, text: '30 seconds per question. Your response time is recorded automatically.' },
  { icon: 'flash-outline' as const, text: 'A correct answer earns 5 points — the fastest correct answer takes the point.' },
  { icon: 'ribbon-outline' as const, text: 'Highest score wins. If scores are level, the faster total time wins.' },
  { icon: 'shield-checkmark-outline' as const, text: 'No opponent found within 90 seconds? Your entry fee is refunded automatically.' },
];

export default function CompeteScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { subjects, reload } = useSubjects(20000);
  const [fees, setFees] = useState({ competition: 20, platform: 3 });
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      settingsService.getPlatformFees().then(({ data }) =>
        setFees({ competition: data.competition_fee_zmw, platform: data.platform_fee_zmw })
      );
    }, [])
  );

  const entry = fees.competition + fees.platform;
  const prize = fees.competition * 2;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? subjects.filter((s) => s.name.toLowerCase().includes(q)) : subjects;
  }, [subjects, query]);
  const waitingTotal = subjects.reduce((n, s) => n + s.waiting, 0);

  const open = (s: Subject) => router.push({ pathname: '/category/[id]', params: { id: s.id } });

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }}
          tintColor={Colors.primary}
        />
      }
    >
      <Header title="Play" />

      <LinearGradient colors={[Colors.primary, Colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroKicker}>HEAD-TO-HEAD · 10 QUESTIONS</Text>
        <Text style={styles.heroTitle}>Win {formatMoney(prize)} in one match</Text>
        <Text style={styles.heroSub}>
          Entry {formatMoney(entry)} · Balance {formatMoney(profile?.balance_zmw)}
          {waitingTotal > 0 ? ` · ${waitingTotal} waiting now` : ''}
        </Text>
        <TouchableOpacity style={styles.quick} activeOpacity={0.9} onPress={() => router.push('/match')}>
          <Ionicons name="flash" size={18} color={Colors.primaryDeep} />
          <Text style={styles.quickText}>Quick match · any subject</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subjects"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.section}>Subjects</Text>
      {shown.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>{subjects.length === 0 ? 'Subjects will appear here as soon as they are added.' : 'No subject matches your search.'}</Text>
        </View>
      ) : (
        <SubjectGrid items={shown} onPress={open} />
      )}

      <Text style={styles.section}>How a match works</Text>
      <View style={styles.card}>
        {RULES.map((r, i) => (
          <View key={r.text} style={[styles.rule, i < RULES.length - 1 && styles.divider]}>
            <View style={styles.ruleIcon}>
              <Ionicons name={r.icon} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.ruleText}>{r.text}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadows.button },
  heroKicker: { color: Colors.whiteDim, fontSize: Typography.size.xs, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: Colors.white, fontSize: Typography.size.xxl, fontWeight: '800', marginTop: 6 },
  heroSub: { color: Colors.whiteMuted, fontSize: Typography.size.sm, marginTop: 6, marginBottom: Spacing.lg },
  quick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.white, paddingVertical: 13, borderRadius: BorderRadius.md },
  quickText: { color: Colors.primaryDeep, fontWeight: '800' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, height: 46, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  searchInput: { flex: 1, color: Colors.text, fontSize: Typography.size.md, paddingVertical: 0 },
  section: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '800', marginBottom: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  empty: { color: Colors.textMuted, paddingVertical: Spacing.lg, textAlign: 'center', fontSize: Typography.size.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  ruleIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 19 },
});
