/**
 * Head-to-head competition UI
 * Loads competition + questions via services; realtime-ready
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/LoadingState';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import type { Competition, Question } from '@/types';

export default function CompetitionPlayScreen() {
  const router = useRouter();
  const { competitionId } = useLocalSearchParams<{ competitionId?: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selected, setSelected] = useState<number | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);
  const [answeredAt, setAnsweredAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartedAt = useRef(Date.now());

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = useCallback((seconds: number) => {
    clearTimer();
    setTimeLeft(seconds);
    questionStartedAt.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    let unsub = () => {};

    const init = async () => {
      if (!competitionId) {
        setLoading(false);
        return;
      }
      const { data } = await competitionsService.getById(competitionId);
      if (data) {
        setCompetition(data);
        setMyScore(data.player1_score);
        setOppScore(data.player2_score);
        unsub = competitionsService.subscribeToCompetition(competitionId, (c) => {
          setCompetition(c);
          setMyScore(c.player1_score);
          setOppScore(c.player2_score);
          if (c.status === 'completed') {
            router.replace({
              pathname: '/results/outcome',
              params: { competitionId: c.id },
            });
          }
        });
      }
      // Questions are loaded by competition/quiz pipeline once backend is wired
      // setQuestion(...) from quiz question list
      setLoading(false);
    };

    init();
    return () => {
      clearTimer();
      unsub();
    };
  }, [competitionId, router]);

  useEffect(() => {
    if (question) {
      setSelected(null);
      setFeedback(null);
      setAnsweredAt(null);
      startTimer(question.time_limit_sec || 15);
    }
  }, [question, startTimer]);

  const onSelect = async (index: number) => {
    if (selected !== null || !competitionId || !question) return;
    setSelected(index);
    clearTimer();
    const timeTakenMs = Date.now() - questionStartedAt.current;
    setAnsweredAt(timeTakenMs);

    const { data } = await competitionsService.submitAnswer(
      competitionId,
      question.id,
      index,
      timeTakenMs
    );

    if (data) {
      setFeedback(data.is_correct ? 'correct' : 'wrong');
      if (data.is_correct) {
        setMyScore((s) => s + data.points_earned);
      }
    }

    // Advance or finish — real flow driven by backend question list
    setTimeout(() => {
      if (competition?.status === 'completed') {
        router.replace({
          pathname: '/results/outcome',
          params: { competitionId },
        });
      }
    }, 900);
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Starting match…" />
      </Screen>
    );
  }

  const options = question?.options ?? [];
  const prompt = question?.text ?? 'Waiting for the next question…';

  return (
    <Screen contentStyle={styles.content} edges={['top', 'bottom']}>
      <View style={styles.players}>
        <View style={styles.player}>
          <View style={[styles.avatar, styles.me]} />
          <Text style={styles.playerName}>You</Text>
          <Text style={styles.score}>{myScore}</Text>
        </View>
        <View style={styles.vs}>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.timer}>{timeLeft}s</Text>
        </View>
        <View style={styles.player}>
          <View style={[styles.avatar, styles.opp]} />
          <Text style={styles.playerName}>Opponent</Text>
          <Text style={styles.score}>{oppScore}</Text>
        </View>
      </View>

      <Text style={styles.progress}>Question {questionIndex + 1}</Text>

      <View style={styles.questionCard}>
        <Text style={styles.question}>{prompt}</Text>
      </View>

      <View style={styles.options}>
        {options.length === 0 ? (
          <Text style={styles.waiting}>Match is being prepared…</Text>
        ) : (
          options.map((opt, i) => {
            const isSelected = selected === i;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  isSelected && styles.optionSelected,
                  feedback === 'correct' && isSelected && styles.optionCorrect,
                  feedback === 'wrong' && isSelected && styles.optionWrong,
                ]}
                onPress={() => onSelect(i)}
                activeOpacity={0.8}
                disabled={selected !== null}
              >
                <Text
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.lg },
  players: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  player: { alignItems: 'center', flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  me: { backgroundColor: Colors.blue },
  opp: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerName: { color: Colors.textSecondary, fontSize: Typography.size.xs },
  score: { color: Colors.goldDark, fontSize: Typography.size.xl, fontWeight: '800' },
  vs: { alignItems: 'center', paddingHorizontal: Spacing.md },
  vsText: { color: Colors.textMuted, fontWeight: '800', fontSize: Typography.size.sm },
  timer: {
    color: Colors.goldDark,
    fontSize: Typography.size.xxl,
    fontWeight: '800',
    marginTop: 4,
  },
  progress: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    justifyContent: 'center',
  },
  question: {
    color: Colors.text,
    fontSize: Typography.size.lg,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  waiting: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: Typography.size.md,
    marginTop: Spacing.lg,
  },
  options: { gap: Spacing.md },
  option: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionSelected: { borderColor: Colors.gold, backgroundColor: Colors.goldMuted },
  optionCorrect: { borderColor: Colors.success, backgroundColor: Colors.successMuted },
  optionWrong: { borderColor: Colors.error, backgroundColor: Colors.errorMuted },
  optionText: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '500' },
  optionTextSelected: { color: Colors.goldDark, fontWeight: '700' },
});
