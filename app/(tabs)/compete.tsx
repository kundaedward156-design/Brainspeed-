import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { quizzesService } from '@/services/quizzes';
import { competitionsService } from '@/services/competitions';
import type { Quiz } from '@/types';

export default function CompeteScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    quizzesService.listActive().then((res) => {
      setQuizzes(res.data);
      setLoading(false);
    });
  }, []);

  const startMatch = async (quizId?: string) => {
    setStarting(true);
    try {
      const id = quizId ?? quizzes[0]?.id;
      if (!id) {
        Alert.alert('No quizzes available', 'Please try again later.');
        return;
      }
      const { data, error } = await competitionsService.findOrCreateMatch(id);
      if (error || !data) {
        Alert.alert('Unable to start match', error ?? 'Please try again.');
        return;
      }
      router.push({ pathname: '/competition/play', params: { competitionId: data.id } });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Compete" />
        <LoadingState message="Loading quizzes…" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Compete" />
      <Text style={styles.sub}>
        Enter a match and win the pot in {AppConfig.currency}.
      </Text>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>How matching works</Text>
        <Text style={styles.infoBody}>
          Choose a quiz, get matched head-to-head. Faster correct answers score higher.
          Winner takes the prize after the platform fee.
        </Text>
      </Card>

      <Text style={styles.section}>Available Quizzes</Text>
      {quizzes.length === 0 ? (
        <EmptyState
          icon="flash-outline"
          title="No quizzes available"
          message="New quizzes will appear when they are published."
        />
      ) : (
        quizzes.map((q) => (
          <Card key={q.id} style={styles.quizCard}>
            <View style={styles.quizRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quizTitle}>{q.title}</Text>
                <View style={styles.metaRow}>
                  <Badge label={`${AppConfig.currencySymbol}${q.entry_fee_zmw}`} variant="gold" />
                  <Text style={styles.qCount}>{q.question_count} questions</Text>
                </View>
              </View>
              <Button title="Play" size="sm" loading={starting} onPress={() => startMatch(q.id)} />
            </View>
          </Card>
        ))
      )}

      {quizzes.length > 0 ? (
        <Button
          title="Quick Match"
          onPress={() => startMatch()}
          loading={starting}
          size="lg"
          fullWidth
          style={{ marginTop: Spacing.xl }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginBottom: Spacing.xl, lineHeight: 20 },
  infoCard: { marginBottom: Spacing.xl },
  infoTitle: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md, marginBottom: 6 },
  infoBody: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
  section: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '700', marginBottom: Spacing.md },
  quizCard: { marginBottom: Spacing.md },
  quizRow: { flexDirection: 'row', alignItems: 'center' },
  quizTitle: { color: Colors.text, fontWeight: '600', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qCount: { color: Colors.textMuted, fontSize: Typography.size.xs },
});
