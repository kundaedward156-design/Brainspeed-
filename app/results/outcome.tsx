import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function ResultsScreen() {
  const router = useRouter();
  const { competitionId, score } = useLocalSearchParams<{ competitionId?: string; score?: string }>();

  return (
    <Screen contentStyle={styles.wrap}>
      <Header title="Results" showBack />
      <Text style={styles.title}>Quiz finished</Text>
      {score != null ? <Text style={styles.score}>Score: {score}</Text> : null}
      {competitionId ? (
        <Button
          title="Leaderboard"
          onPress={() => router.push(`/competition/leaderboard?id=${competitionId}`)}
          fullWidth
          style={{ marginTop: Spacing.xl }}
        />
      ) : null}
      <Button
        title="Home"
        variant="outline"
        onPress={() => router.replace('/(tabs)')}
        fullWidth
        style={{ marginTop: Spacing.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: Spacing.xxl },
  title: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '800' },
  score: { color: Colors.goldDark, fontSize: Typography.size.display, fontWeight: '800', marginTop: Spacing.md },
});
