/**
 * Introduction — how a match works (taken from the product brief).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/Logo';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';

const STEPS = [
  { icon: 'people' as const, title: 'Two players, one match', body: 'You are matched with another player. Both of you must accept before the game starts.' },
  { icon: 'time' as const, title: 'Same question, same time', body: 'Four choices, a 30-second timer, and your response time is recorded automatically.' },
  { icon: 'flash' as const, title: 'Fastest correct answer scores', body: 'Every point-scoring answer is worth 5 points. Highest score wins — ties go to the faster player.' },
  { icon: 'trophy' as const, title: 'Win real rewards', body: 'Winners take the prize straight into their wallet and can withdraw to mobile money.' },
];

export default function IntroScreen() {
  const router = useRouter();

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.hero}>
        <LogoMark size="lg" />
        <Text style={styles.heading}>How it works</Text>
        <Text style={styles.sub}>Knowledge meets competition. Speed meets rewards.</Text>
      </View>

      {STEPS.map((s, i) => (
        <View key={s.title} style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>
              {i + 1}. {s.title}
            </Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Button title="Get started" onPress={() => router.push('/(auth)/login')} size="lg" fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xl },
  hero: { alignItems: 'center', marginBottom: Spacing.xxl },
  heading: { color: Colors.text, fontSize: Typography.size.xxxl, fontWeight: '800', marginTop: Spacing.lg },
  sub: { color: Colors.textSecondary, fontSize: Typography.size.md, marginTop: 6, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  cardText: { flex: 1 },
  cardTitle: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '700', marginBottom: 4 },
  cardBody: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
  footer: { marginTop: Spacing.xl, marginBottom: Spacing.xl },
});
