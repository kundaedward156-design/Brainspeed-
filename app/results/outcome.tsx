/**
 * Match results — both players, points (green high / red low), times, correct counts, Compete Again
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { competitionsService } from '@/services/competitions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

function formatTime(ms: number) {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m > 0) return `${m}m ${rem}s`;
  return `${s}s`;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { competitionId, score, timeMs } = useLocalSearchParams<{
    competitionId?: string;
    score?: string;
    timeMs?: string;
  }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [comp, setComp] = useState<any>(null);
  const [p1, setP1] = useState<any>(null);
  const [p2, setP2] = useState<any>(null);
  const [p1Correct, setP1Correct] = useState(0);
  const [p2Correct, setP2Correct] = useState(0);
  const [p1Time, setP1Time] = useState(0);
  const [p2Time, setP2Time] = useState(0);

  useEffect(() => {
    (async () => {
      if (!competitionId) {
        setLoading(false);
        return;
      }
      const { data } = await competitionsService.getById(competitionId);
      setComp(data);
      if (data) {
        // Load profiles
        const ids = [data.player1_id, data.player2_id].filter(Boolean);
        if (ids.length && supabase) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
          const map = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
          setP1(map[data.player1_id] || null);
          setP2(map[data.player2_id] || null);
        }
        // Correct counts + times from answers
        const { data: answers } = await supabase
          ?.from('answers')
          .select('player_id, is_correct, time_taken_ms, points_earned')
          .eq('competition_id', competitionId) || { data: [] };
        let c1 = 0, c2 = 0, t1 = 0, t2 = 0;
        (answers || []).forEach((a: any) => {
          if (a.player_id === data.player1_id) {
            if (a.is_correct) c1++;
            t1 += a.time_taken_ms || 0;
          } else if (a.player_id === data.player2_id) {
            if (a.is_correct) c2++;
            t2 += a.time_taken_ms || 0;
          }
        });
        setP1Correct(c1);
        setP2Correct(c2);
        setP1Time(t1 || (data as any).player1_time_ms || 0);
        setP2Time(t2 || (data as any).player2_time_ms || 0);
      }
      setLoading(false);
    })();
  }, [competitionId]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </Screen>
    );
  }

  const myId = profile?.id;
  const isP1 = myId === comp?.player1_id;
  const myScore = Number(score) || (isP1 ? comp?.player1_score : comp?.player2_score) || 0;
  const oppScore = isP1 ? (comp?.player2_score || 0) : (comp?.player1_score || 0);
  const winnerId = comp?.winner_id;
  const iWon = winnerId && winnerId === myId;
  const winnerName = winnerId === comp?.player1_id ? (p1?.full_name || 'Player 1') : (p2?.full_name || 'Player 2');
  const winnerScore = winnerId === comp?.player1_id ? (comp?.player1_score || 0) : (comp?.player2_score || 0);
  const winnerTime = winnerId === comp?.player1_id ? p1Time : p2Time;

  const left = {
    name: isP1 ? (p1?.full_name || profile?.full_name || 'You') : (p2?.full_name || 'You'),
    score: isP1 ? (comp?.player1_score ?? myScore) : (comp?.player2_score ?? myScore),
    correct: isP1 ? p1Correct : p2Correct,
    time: isP1 ? p1Time : p2Time,
    isMe: true,
    isWinner: iWon,
  };
  const right = {
    name: isP1 ? (p2?.full_name || 'Opponent') : (p1?.full_name || 'Opponent'),
    score: isP1 ? (comp?.player2_score || 0) : (comp?.player1_score || 0),
    correct: isP1 ? p2Correct : p1Correct,
    time: isP1 ? p2Time : p1Time,
    isMe: false,
    isWinner: !iWon && !!winnerId,
  };

  // Ensure higher score on right or left with green
  const leftHigh = left.score >= right.score;

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.trophyWrap}>
          <LinearGradient colors={[Colors.gold, Colors.orange]} style={styles.trophy}>
            <Ionicons name="trophy" size={36} color="#000" />
          </LinearGradient>
        </View>
        <Text style={styles.winnerLabel}>WINNER</Text>
        <Text style={styles.winnerName}>{winnerName || '—'}</Text>
        <Text style={styles.winnerMeta}>
          {winnerScore} points in {formatTime(winnerTime || Number(timeMs) || 0)}
        </Text>

        <View style={styles.cards}>
          {/* Left player card */}
          <View style={[styles.card, left.isWinner && styles.cardWinner]}>
            <View style={[styles.av, { backgroundColor: Colors.gold }]}>
              <Text style={styles.avLetter}>{(left.name || 'E')[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.cardName} numberOfLines={1}>{left.name}</Text>
            <Text style={[styles.cardPoints, { color: leftHigh ? Colors.success : Colors.error }]}>
              {left.score}
            </Text>
            <Text style={styles.pointsLabel}>POINTS</Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{formatTime(left.time)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{left.correct} correct</Text>
            </View>
            {left.isWinner && (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>WINNER</Text>
              </View>
            )}
          </View>

          {/* Right player card */}
          <View style={[styles.card, right.isWinner && styles.cardWinner]}>
            <View style={[styles.av, { backgroundColor: Colors.surfaceElevated }]}>
              <Ionicons name="person" size={22} color={Colors.textMuted} />
            </View>
            <Text style={styles.cardName} numberOfLines={1}>{right.name}</Text>
            <Text style={[styles.cardPoints, { color: !leftHigh ? Colors.success : Colors.error }]}>
              {right.score}
            </Text>
            <Text style={styles.pointsLabel}>POINTS</Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{formatTime(right.time)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{right.correct} correct</Text>
            </View>
            {right.isWinner && (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>WINNER</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.replace('/(tabs)/compete')}
          style={styles.competeBtnWrap}
        >
          <LinearGradient
            colors={[Colors.gold, Colors.orange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.competeBtn}
          >
            <Ionicons name="refresh" size={20} color="#000" />
            <Text style={styles.competeBtnText}>Compete Again</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="home-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, alignItems: 'center', padding: Spacing.lg, paddingTop: Spacing.xxl },
  trophyWrap: { marginBottom: Spacing.md },
  trophy: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerLabel: {
    color: Colors.gold,
    fontWeight: '700',
    fontSize: Typography.size.xs,
    letterSpacing: 2,
    marginBottom: 4,
  },
  winnerName: {
    color: Colors.text,
    fontSize: Typography.size.xxl,
    fontWeight: '800',
  },
  winnerMeta: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    marginTop: 4,
    marginBottom: Spacing.xxl,
  },
  cards: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: Spacing.xxl,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardWinner: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceElevated,
  },
  av: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avLetter: { color: '#000', fontWeight: '800', fontSize: 20 },
  cardName: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: Typography.size.sm,
    marginBottom: Spacing.sm,
  },
  cardPoints: {
    fontSize: Typography.size.xxxl,
    fontWeight: '800',
  },
  pointsLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: { color: Colors.textMuted, fontSize: Typography.size.xs },
  winnerBadge: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  winnerBadgeText: { color: '#000', fontWeight: '800', fontSize: 11 },
  competeBtnWrap: { width: '100%', marginBottom: Spacing.md },
  competeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
  },
  competeBtnText: { color: '#000', fontWeight: '800', fontSize: Typography.size.md },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  homeBtnText: { color: Colors.textSecondary, fontSize: Typography.size.sm },
});
