/**
 * Play hub — rules at a glance and the entry point to matchmaking.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { settingsService } from '@/services/settings';
import { useAuth } from '@/contexts/AuthContext';

const RULES = [
  { icon: 'people-outline' as const, text: 'Two players per match. Both must accept before it starts.' },
  { icon: 'help-circle-outline' as const, text: 'Same question for both players at the same time, with four answer choices.' },
  { icon: 'timer-outline' as const, text: '30 seconds per question. Your response time is recorded automatically.' },
  { icon: 'flash-outline' as const, text: 'A correct answer earns 5 points — the fastest correct answer takes the point.' },
  { icon: 'ribbon-outline' as const, text: 'Highest score wins. If scores are level, the faster total time wins.' },
];

export default function CompeteScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [fees, setFees] = useState({ competition: 20, platform: 3 });

  useFocusEffect(
    useCallback(() => {
      settingsService.getPlatformFees().then(({ data }) =>
        setFees({ competition: data.competition_fee_zmw, platform: data.platform_fee_zmw })
      );
    }, [])
  );

  const entry = fees.competition + fees.platform;
  const prize = fees.competition * 2;

  return (
    <Screen scroll>
      <Header title="Play" />

      <LinearGradient colors={[Colors.primary, Colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroKicker}>HEAD-TO-HEAD</Text>
        <Text style={styles.heroTitle}>Win {formatMoney(prize)} in one match</Text>
        <Text style={styles.heroSub}>
          Entry {formatMoney(entry)} · Your balance {formatMoney(profile?.balance_zmw)}
        </Text>
        <Button title="Find match" icon="flash" variant="secondary" size="lg" fullWidth onPress={() => router.push('/match')} style={styles.heroBtn} textStyle={{ color: Colors.primaryDeep }} />
      </LinearGradient>

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
  hero: { borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.button },
  heroKicker: { color: Colors.whiteDim, fontSize: Typography.size.xs, fontWeight: '800', letterSpacing: 1.4 },
  heroTitle: { color: Colors.white, fontSize: Typography.size.xxl, fontWeight: '800', marginTop: 6 },
  heroSub: { color: Colors.whiteMuted, fontSize: Typography.size.sm, marginTop: 6, marginBottom: Spacing.lg },
  heroBtn: { backgroundColor: Colors.white },
  section: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '800', marginBottom: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  rule: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  ruleIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 19 },
});
