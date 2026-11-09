/**
 * Competition detail — 2-player real-time quiz match
 * Matches foundation: 2 players, same Q at same time, 4 choices, 5 pts, 30s timer,
 * response time recorded, fastest correct gets points, results with both players.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import { useAuth } from '@/contexts/AuthContext';
import type { Competition, QuizQuestion } from '@/types';

const QUESTION_TIME = 30; // seconds per question
const POINTS_CORRECT = 5;

export default function CompetitionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [comp, setComp] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [questionStart, setQuestionStart] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [c, q] = await Promise.all([
      competitionsService.getById(id),
      competitionsService.listQuestions(id),
    ]);
    setComp(c.data);
    setQuestions(q.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for opponent join / scores while waiting or playing
  useEffect(() => {
    if (!id || !comp) return;
    if (comp.status === 'completed' || comp.status === 'finished') return;

    pollRef.current = setInterval(async () => {
      const { data } = await competitionsService.getById(id);
      if (data) {
        setComp(data);
        if (data.status === 'active' || data.status === 'completed') {
          if (profile?.id === data.player1_id) {
            setOppScore(data.player2_score || 0);
          } else {
            setOppScore(data.player1_score || 0);
          }
        }
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, comp?.status, profile?.id]);

  // 30s countdown timer per question
  useEffect(() => {
    if (!comp || comp.status !== 'active' || feedback || questions.length === 0) return;

    setTimeLeft(QUESTION_TIME);
    setQuestionStart(Date.now());
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index, comp?.status, questions.length]);

  const handleTimeout = () => {
    if (feedback || submitting) return;
    setFeedback('wrong');
    setTimeout(() => advance(false), 800);
  };

  const onAnswer = async (optIndex: number) => {
    if (!id || !profile?.id || submitting || feedback) return;
    const q = questions[index];
    if (!q) return;
    setSelected(optIndex);
    setSubmitting(true);
    const elapsed = Date.now() - questionStart;
    setTotalTimeMs((t) => t + elapsed);

    const { correct, points, error } = await competitionsService.submitAnswer(
      id,
      q.id,
      optIndex,
      profile.id,
      elapsed
    );
    setSubmitting(false);
    if (error) {
      Alert.alert('Answer failed', error);
      setSelected(null);
      return;
    }
    if (correct) {
      setFeedback('correct');
      const newScore = scoreRef.current + (points || POINTS_CORRECT);
      scoreRef.current = newScore;
      setMyScore(newScore);
    } else {
      setFeedback('wrong');
    }
    setTimeout(() => advance(correct), 900);
  };

  const advance = async (wasCorrect: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback(null);
    setSelected(null);

    if (index + 1 >= questions.length) {
      if (id && profile?.id) {
        await competitionsService.finishCompetition(id, profile.id, scoreRef.current, totalTimeMs);
      }
      router.replace({
        pathname: '/results/outcome',
        params: {
          competitionId: id,
          score: String(scoreRef.current),
          timeMs: String(totalTimeMs),
        },
      });
      return;
    }
    setIndex((i) => i + 1);
  };

  if (loading || !comp) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading match…</Text>
        </View>
      </Screen>
    );
  }

  // Waiting / Finding opponent UI (matches screenshot)
  if (comp.status === 'waiting' || !comp.player2_id) {
    return (
      <Screen>
        <View style={styles.findingContainer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.findingIconWrap}>
            <LinearGradient
              colors={[Colors.gold, Colors.orange]}
              style={styles.findingIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flash" size={36} color="#000" />
            </LinearGradient>
          </View>
          <Text style={styles.findingTitle}>Finding opponent…</Text>
          <Text style={styles.findingSub}>Searching for a player to challenge</Text>
          <View style={styles.matchingRow}>
            <ActivityIndicator size="small" color={Colors.gold} />
            <Text style={styles.matchingText}>Matching in progress</Text>
          </View>
          <View style={styles.dots}>
            <View style={[styles.dot, { backgroundColor: Colors.gold }]} />
            <View style={[styles.dot, { backgroundColor: Colors.goldLight, opacity: 0.6 }]} />
            <View style={[styles.dot, { backgroundColor: Colors.orange, opacity: 0.4 }]} />
          </View>
        </View>
      </Screen>
    );
  }

  const current = questions[index];
  const timerPct = timeLeft / QUESTION_TIME;

  return (
    <Screen>
      {/* Top scores bar */}
      <View style={styles.topBar}>
        <View style={styles.playerScore}>
          <View style={[styles.avatarSmall, { backgroundColor: Colors.gold }]}>
            <Text style={styles.avatarLetter}>{(profile?.full_name || 'Y')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.youLabel}>You</Text>
          <Text style={styles.scoreVal}>{myScore}</Text>
        </View>
        <View style={styles.qCenter}>
          <Text style={styles.qProgress}>Question</Text>
          <Text style={styles.qNum}>{index + 1}/{questions.length || 10}</Text>
        </View>
        <View style={[styles.playerScore, { alignItems: 'flex-end' }]}>
          <Text style={styles.scoreVal}>{oppScore}</Text>
          <Text style={styles.youLabel}>Opponent</Text>
          <View style={[styles.avatarSmall, { backgroundColor: Colors.surfaceElevated }]}>
            <Ionicons name="person" size={16} color={Colors.textMuted} />
          </View>
        </View>
      </View>

      {/* Timer bar */}
      <View style={styles.timerRow}>
        <Ionicons name="time-outline" size={16} color={Colors.gold} />
        <Text style={styles.timerText}>{timeLeft}s</Text>
        <View style={styles.timerTrack}>
          <View
            style={[
              styles.timerFill,
              {
                width: `${Math.max(0, timerPct) * 100}%`,
                backgroundColor: timeLeft <= 5 ? Colors.error : Colors.gold,
              },
            ]}
          />
        </View>
        <View style={styles.diffBadge}>
          <Text style={styles.diffText}>Easy</Text>
        </View>
      </View>

      {/* Subject tags */}
      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>Subject: Quiz</Text>
        </View>
        <View style={[styles.tag, styles.tagGreen]}>
          <Text style={[styles.tagText, { color: Colors.success }]}>Difficulty: Easy</Text>
        </View>
      </View>

      {current ? (
        <View style={styles.qArea}>
          <Text style={styles.question}>{current.question}</Text>
          {current.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selected === i;
            const isCorrect = feedback === 'correct' && isSelected;
            const isWrong = feedback === 'wrong' && isSelected;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.opt,
                  isSelected && styles.optSelected,
                  isCorrect && styles.optCorrect,
                  isWrong && styles.optWrong,
                ]}
                onPress={() => onAnswer(i)}
                disabled={!!feedback || submitting}
                activeOpacity={0.8}
              >
                <View style={[styles.optLetter, isSelected && styles.optLetterActive]}>
                  <Text style={styles.optLetterText}>{letter}</Text>
                </View>
                <Text style={styles.optText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noQ}>No questions found.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md },
  findingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  backBtn: { position: 'absolute', top: 12, left: 16, padding: 8 },
  findingIconWrap: { marginBottom: Spacing.xl },
  findingIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingTitle: {
    color: Colors.text,
    fontSize: Typography.size.xxl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  findingSub: { color: Colors.textSecondary, fontSize: Typography.size.md },
  matchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: 8,
  },
  matchingText: { color: Colors.gold, fontSize: Typography.size.sm },
  dots: { flexDirection: 'row', gap: 8, marginTop: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  playerScore: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 90 },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#000', fontWeight: '800', fontSize: 13 },
  youLabel: { color: Colors.textMuted, fontSize: Typography.size.xs },
  scoreVal: { color: Colors.text, fontWeight: '800', fontSize: Typography.size.lg },
  qCenter: { alignItems: 'center' },
  qProgress: { color: Colors.textMuted, fontSize: Typography.size.xs },
  qNum: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  timerText: { color: Colors.gold, fontWeight: '700', fontSize: Typography.size.sm, minWidth: 28 },
  timerTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 3 },
  diffBadge: {
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffText: { color: Colors.success, fontSize: 11, fontWeight: '600' },
  tags: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginBottom: Spacing.lg,
  },
  tag: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagGreen: { backgroundColor: Colors.successMuted },
  tagText: { color: Colors.textSecondary, fontSize: Typography.size.xs },
  qArea: { paddingHorizontal: Spacing.md, flex: 1 },
  question: {
    color: Colors.text,
    fontSize: Typography.size.xl,
    fontWeight: '600',
    marginBottom: Spacing.xl,
    lineHeight: 28,
  },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optSelected: { borderColor: Colors.gold, backgroundColor: Colors.goldMuted },
  optCorrect: { borderColor: Colors.success, backgroundColor: Colors.successMuted },
  optWrong: { borderColor: Colors.error, backgroundColor: Colors.errorMuted },
  optLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optLetterActive: { backgroundColor: Colors.gold },
  optLetterText: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  optText: { color: Colors.text, fontSize: Typography.size.md, flex: 1 },
  noQ: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
});
