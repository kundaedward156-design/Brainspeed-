/**
 * Competition detail — join, answer questions one-by-one, score feedback
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
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [c, q] = await Promise.all([
      competitionsService.getById(id),
      competitionsService.listQuestions(id),
    ]);
    setComp(c.data);
    setQuestions(q.data);
    if (profile?.id) {
      const entry = await competitionsService.getMyEntry(id, profile.id);
      if (entry.data) {
        setJoined(true);
        setScore(entry.data.score ?? 0);
      }
    }
    setLoading(false);
  }, [id, profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onJoin = async () => {
    if (!id) return;
    setJoining(true);
    const { error } = await competitionsService.join(id);
    setJoining(false);
    if (error) {
      const msg = error.toLowerCase().includes('join')
        ? error
        : friendlyError(error);
      Alert.alert('Could not join', msg);
      return;
    }
    setJoined(true);
    Alert.alert('Joined!', 'Answer each question once. Good luck.');
  };

  const onAnswer = async (answer: string) => {
    if (!id || submitting || feedback) return;
    const q = questions[index];
    if (!q) return;
    setSelected(answer);
    setSubmitting(true);
    const { correct, error } = await competitionsService.submitAnswer(id, q.id, answer);
    setSubmitting(false);
    if (error) {
      Alert.alert('Answer failed', friendlyError(error));
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

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      setFeedback(null);
      return;
    }
    setIndex((i) => i + 1);
    setFeedback(null);
    setSelected(null);
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Competition" showBack />
        <LoadingState message="Loading quiz…" />
      </Screen>
    );
  }

  if (!comp) {
    return (
      <Screen>
        <Header title="Competition" showBack />
        <Text style={styles.error}>Competition not found.</Text>
      </Screen>
    );
  }

  const current = questions[index];

  return (
    <Screen scroll contentStyle={styles.content}>
      <Header title={comp.title} showBack />

      <View style={styles.metaRow}>
        <Text style={styles.reward}>
          {comp.reward != null ? `Reward: ${comp.reward}` : 'Quiz'}
        </Text>
        <TouchableOpacity
          style={styles.lbBtn}
          onPress={() => router.push(`/competition/leaderboard?id=${id}`)}
        >
          <Ionicons name="trophy-outline" size={18} color={Colors.goldDark} />
          <Text style={styles.lbText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {!joined ? (
        <View style={styles.joinBox}>
          <Text style={styles.joinHint}>
            Join this competition to answer questions and climb the leaderboard.
          </Text>
          <Text style={styles.qCount}>{questions.length} question{questions.length === 1 ? '' : 's'}</Text>
          <Button title="Join competition" onPress={onJoin} loading={joining} fullWidth size="lg" />
        </View>
      ) : finished ? (
        <View style={styles.joinBox}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
          <Text style={styles.doneTitle}>Quiz complete</Text>
          <Text style={styles.scoreBig}>Score: {score}</Text>
          <Button
            title="View leaderboard"
            onPress={() => router.push(`/competition/leaderboard?id=${id}`)}
            fullWidth
            style={{ marginTop: Spacing.lg }}
          />
          <Button
            title="Back to home"
            variant="outline"
            onPress={() => router.replace('/(tabs)')}
            fullWidth
            style={{ marginTop: Spacing.md }}
          />
        </View>
      ) : !current ? (
        <Text style={styles.error}>No questions in this quiz yet.</Text>
      ) : (
        <View>
          <View style={styles.progressRow}>
            <Text style={styles.progress}>
              Question {index + 1} of {questions.length}
            </Text>
            <Text style={styles.scoreLive}>Score: {score}</Text>
          </View>

          <View style={styles.qCard}>
            <Text style={styles.qText}>{current.question}</Text>
          </View>

          {current.options.map((opt) => {
            const isSelected = selected === opt;
            let optStyle = styles.option;
            if (feedback && isSelected) {
              optStyle = feedback === 'correct' ? styles.optionCorrect : styles.optionWrong;
            } else if (isSelected) {
              optStyle = styles.optionSelected;
            }
            return (
              <TouchableOpacity
                key={opt}
                style={optStyle}
                disabled={!!feedback || submitting}
                onPress={() => onAnswer(opt)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}

          {submitting ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: Spacing.lg }} />
          ) : null}

          {feedback ? (
            <View style={styles.feedbackBox}>
              <Text
                style={[
                  styles.feedbackText,
                  feedback === 'correct' ? styles.ok : styles.bad,
                ]}
              >
                {feedback === 'correct' ? 'Correct!' : 'Wrong'}
              </Text>
              <Text style={styles.scoreLive}>Running score: {score}</Text>
              <Button
                title={index + 1 >= questions.length ? 'Finish' : 'Next question'}
                onPress={next}
                fullWidth
                style={{ marginTop: Spacing.md }}
              />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('join')) return 'Join the competition first.';
  if (m.includes('already') || m.includes('once')) return 'You already answered this question.';
  if (m.includes('permission') || m.includes('policy')) return 'You do not have permission for this action.';
  return msg;
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.sm },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  reward: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: '600' },
  lbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  lbText: { color: Colors.goldDark, fontWeight: '700', fontSize: Typography.size.sm },
  joinBox: { alignItems: 'center', paddingVertical: Spacing.xxl },
  joinHint: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  qCount: { color: Colors.textMuted, marginBottom: Spacing.xl },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  progress: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  scoreLive: { color: Colors.goldDark, fontWeight: '800', fontSize: Typography.size.sm },
  qCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    justifyContent: 'center',
  },
  qText: {
    color: Colors.text,
    fontSize: Typography.size.lg,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  option: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  optionSelected: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  optionCorrect: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  optionWrong: {
    backgroundColor: Colors.errorMuted,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  optionText: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '500' },
  feedbackBox: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.lg,
  },
  feedbackText: { fontSize: Typography.size.xl, fontWeight: '800', marginBottom: Spacing.sm },
  ok: { color: Colors.success },
  bad: { color: Colors.error },
  doneTitle: {
    color: Colors.text,
    fontSize: Typography.size.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  scoreBig: {
    color: Colors.goldDark,
    fontSize: Typography.size.display,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  error: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xxl },
});
