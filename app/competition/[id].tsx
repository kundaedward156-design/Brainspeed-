/**
 * Competition detail — 2-player quiz play
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import { useAuth } from '@/contexts/AuthContext';
import type { Competition, QuizQuestion } from '@/types';

export default function CompetitionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [comp, setComp] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [c, q] = await Promise.all([
      competitionsService.getById(id),
      competitionsService.listQuestions(id),
    ]);
    setComp(c.data);
    setQuestions(q.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onAnswer = async (optIndex: number) => {
    if (!id || !profile?.id || submitting || feedback) return;
    const q = questions[index];
    if (!q) return;
    setSelected(optIndex);
    setSubmitting(true);
    const { correct, error } = await competitionsService.submitAnswer(id, q.id, optIndex, profile.id);
    setSubmitting(false);
    if (error) {
      Alert.alert('Answer failed', error);
      setSelected(null);
      return;
    }
    if (correct) {
      setFeedback('correct');
      setScore((s) => s + 1);
    } else {
      setFeedback('wrong');
    }
  };

  const next = async () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      setFeedback(null);
      if (id && profile?.id) {
        await competitionsService.finishCompetition(id, profile.id, score);
      }
      return;
    }
    setIndex((i) => i + 1);
    setFeedback(null);
    setSelected(null);
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Quiz" showBack />
        <LoadingState message="Loading quiz…" />
      </Screen>
    );
  }

  if (!comp) {
    return (
      <Screen>
        <Header title="Quiz" showBack />
        <Text style={styles.error}>Competition not found.</Text>
      </Screen>
    );
  }

  const current = questions[index];

  if (finished) {
    return (
      <Screen>
        <Header title="Finished" showBack />
        <View style={styles.joinBox}>
          <Text style={styles.joinHint}>Your score: {score} / {questions.length}</Text>
          <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
            Results and prize will be updated when both players finish.
          </Text>
          <Button title="Back to home" onPress={() => router.replace('/')} style={{ marginTop: 24 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Header title={comp.status === 'waiting' ? 'Waiting for opponent…' : 'Quiz'} showBack />

      <View style={styles.metaRow}>
        <Text style={styles.reward}>Entry: K{comp.entry_fee_zmw ?? 0} · Prize: K{comp.prize_zmw ?? 0}</Text>
      </View>

      {comp.status === 'waiting' ? (
        <View style={styles.joinBox}>
          <ActivityIndicator color={Colors.gold} />
          <Text style={styles.joinHint}>Waiting for another player to join…</Text>
        </View>
      ) : current ? (
        <View>
          <Text style={styles.qNum}>Question {index + 1} of {questions.length}</Text>
          <Text style={styles.question}>{current.question}</Text>
          {current.options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.opt, selected === i && styles.optSelected]}
              onPress={() => onAnswer(i)}
              disabled={!!feedback}
            >
              <Text style={styles.optText}>{opt}</Text>
            </TouchableOpacity>
          ))}
          {feedback && (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: feedback === 'correct' ? Colors.success : Colors.error, fontWeight: '700' }}>
                {feedback === 'correct' ? 'Correct!' : 'Wrong'}
              </Text>
              <Button title={index + 1 >= questions.length ? 'Finish' : 'Next'} onPress={next} style={{ marginTop: 12 }} />
            </View>
          )}
        </View>
      ) : (
        <Text>No questions found for this quiz.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  reward: { color: Colors.goldDark, fontWeight: '700' },
  joinBox: { alignItems: 'center', padding: Spacing.xl },
  joinHint: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md },
  qNum: { color: Colors.textMuted, marginBottom: Spacing.sm },
  question: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '600', marginBottom: Spacing.lg },
  opt: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optSelected: { borderColor: Colors.gold },
  optText: { color: Colors.text },
  error: { color: Colors.error, textAlign: 'center', marginTop: 40 },
});
