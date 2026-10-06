/**
 * Introduction — light surface, product copy only
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';

const SECTIONS = [
  {
    icon: 'bulb-outline' as const,
    title: 'Test Your Knowledge',
    body: 'Challenge yourself across categories built for speed and accuracy.',
  },
  {
    icon: 'people-outline' as const,
    title: 'Beat Your Opponent',
    body: 'Go head-to-head in real-time quiz battles.',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Think Fast',
    body: 'Every second counts. Answer quickly to maximize your score.',
  },
  {
    icon: 'trophy-outline' as const,
    title: 'Get Rewarded',
    body: 'Win competitions and earn real rewards in ZMW.',
  },
];

export default function IntroScreen() {
  const router = useRouter();

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.heading}>How Brainspeed Works</Text>
      <Text style={styles.sub}>Knowledge meets competition. Speed meets rewards.</Text>

      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={24} color={Colors.goldDark} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(auth)/login')}
          size="lg"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xxl },
  heading: {
    color: Colors.text,
    fontSize: Typography.size.xxxl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: Typography.size.md,
    marginBottom: Spacing.xxxl,
    lineHeight: 22,
  },
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
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  cardText: { flex: 1 },
  cardTitle: {
    color: Colors.text,
    fontSize: Typography.size.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardBody: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
  footer: { marginTop: Spacing.xxl, marginBottom: Spacing.xl },
});
