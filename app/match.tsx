/**
 * Match flow. One screen, driven entirely by server state:
 * confirm → searching → opponent request (accept / decline) → countdown → questions → results.
 * The phone never decides anything; it only sends intentions to the `match` Edge Function.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert, BackHandler, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { matchService } from '@/services/match';
import { settingsService } from '@/services/settings';
import { categoriesService } from '@/services/categories';
import { openLink, useLinks } from '@/hooks/useLinks';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { MatchState } from '@/types';

type Stage = 'loading' | 'confirm' | 'searching' | 'timeout' | 'invited' | 'invite_ended' | 'request' | 'play' | 'error';

export default function MatchScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const links = useLinks();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const categoryId = category ? String(category) : null;
  const [subject, setSubject] = useState<{ name: string; playable: boolean; waiting: number } | null>(null);

  const [stage, setStage] = useState<Stage>('loading');
  const [state, setState] = useState<MatchState | null>(null);
  const [fees, setFees] = useState({ competition: 20, platform: 3 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // re-render driver for countdowns
  const [selected, setSelected] = useState<number | null>(null);
  const [lastGap, setLastGap] = useState<{ index: number; correct: boolean; points: number } | null>(null);

  const offset = useRef(0); // serverTime - deviceTime
  const alive = useRef(true);
  const lastIndex = useRef<number>(-1);
  const answering = useRef(false);
  const timeoutCalled = useRef<number>(-1);

  const nowServer = () => Date.now() + offset.current;

  const apply = useCallback(
    (s: MatchState) => {
      offset.current = s.server_time - Date.now();
      setState(s);
      switch (s.status) {
        case 'idle':
          setStage((prev) => (prev === 'loading' || prev === 'searching' || prev === 'invited' || prev === 'request' || prev === 'play' ? 'confirm' : prev));
          break;
        case 'searching':
          setStage('searching');
          break;
        case 'invite_sent':
          setStage('invited');
          break;
        case 'invite_ended':
          refresh();
          setStage('invite_ended');
          break;
        case 'timeout':
          refresh();
          setStage('timeout');
          break;
        case 'pending_accept':
          setStage('request');
          break;
        case 'active': {
          setStage('play');
          if (s.index !== undefined && s.index !== lastIndex.current) {
            lastIndex.current = s.index;
            setSelected(s.me?.answered ? s.me.selected ?? null : null);
            timeoutCalled.current = -1;
          }
          break;
        }
        case 'completed':
          refresh();
          router.replace({ pathname: '/results/outcome', params: { id: s.competition_id } });
          break;
      }
    },
    [refresh, router]
  );

  const fetchState = useCallback(async () => {
    const { data, error: err } = await matchService.state();
    if (!alive.current) return;
    if (err || !data) {
      if (stage === 'loading') {
        setError(err || 'Could not load');
        setStage('error');
      }
      return;
    }
    apply(data);
  }, [apply, stage]);

  // initial load + fees
  useEffect(() => {
    alive.current = true;
    settingsService.getPlatformFees().then(({ data }) => setFees({ competition: data.competition_fee_zmw, platform: data.platform_fee_zmw }));
    if (categoryId) {
      categoriesService.listWithStats(false).then(({ data }) => {
        const s = data.find((x) => x.id === categoryId);
        if (s) setSubject({ name: s.name, playable: s.playable, waiting: s.waiting });
      });
    }
    fetchState();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // countdown re-render
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 200);
    return () => clearInterval(t);
  }, []);

  // polling by stage (+ realtime during play)
  useEffect(() => {
    if (stage === 'confirm' || stage === 'loading' || stage === 'error' || stage === 'timeout' || stage === 'invite_ended') return;
    const every = stage === 'searching' || stage === 'invited' ? 2000 : stage === 'request' ? 1500 : 3000;
    const t = setInterval(fetchState, every);
    return () => clearInterval(t);
  }, [stage, fetchState]);

  useEffect(() => {
    const id = state?.competition_id;
    if (!supabase || stage !== 'play' || !id) return;
    const ch = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions', filter: `id=eq.${id}` }, () => fetchState())
      .subscribe();
    return () => { supabase?.removeChannel(ch); };
  }, [stage, state?.competition_id, fetchState]);

  // timer expiry → ask the server to advance
  useEffect(() => {
    if (stage !== 'play' || !state?.question_started_at || state.index === undefined) return;
    const end = state.question_started_at + (state.question_seconds ?? 30) * 1000;
    if (nowServer() > end + 300 && timeoutCalled.current !== state.index) {
      timeoutCalled.current = state.index;
      fetchState();
    }
  });

  // block accidental back during a live match
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stage === 'play' || stage === 'request') {
        Alert.alert('Leave the match?', 'You cannot leave a live match without forfeiting.');
        return true;
      }
      if (stage === 'searching') { onCancel(); return true; }
      if (stage === 'invited') { onCancelInvite(); return true; }
      return false;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const entry = fees.competition + fees.platform;
  const balance = Number(profile?.balance_zmw ?? 0);

  const onFind = async () => {
    setBusy(true);
    const { data, error: err } = await matchService.find(categoryId);
    setBusy(false);
    if (err || !data) return Alert.alert('Could not start', err || 'Please try again.');
    refresh();
    apply(data);
  };

  const onCancel = async () => {
    setBusy(true);
    const { data, error: err } = await matchService.cancel();
    setBusy(false);
    if (err) return Alert.alert('Could not cancel', err);
    refresh();
    if (data) apply(data);
    setStage('confirm');
    router.back();
  };

  const onCancelInvite = async () => {
    setBusy(true);
    const { error: err } = await matchService.cancelInvite();
    setBusy(false);
    if (err) return Alert.alert('Could not cancel', err);
    refresh();
    router.back();
  };

  const onRespond = async (accept: boolean) => {
    if (!state?.competition_id) return;
    setBusy(true);
    const { data, error: err } = await matchService.respond(state.competition_id, accept);
    setBusy(false);
    if (err) return Alert.alert('Error', err);
    refresh();
    if (data) apply(data);
  };

  const onAnswer = async (i: number) => {
    if (!state?.competition_id || state.index === undefined || answering.current || selected !== null) return;
    answering.current = true;
    setSelected(i);
    const { data, error: err } = await matchService.answer(state.competition_id, state.index, i);
    answering.current = false;
    if (err || !data) {
      setSelected(null);
      return Alert.alert('Answer not sent', err || 'Please try again.');
    }
    if (data.last_answer) setLastGap({ index: data.last_answer.index, correct: data.last_answer.correct, points: data.last_answer.points });
    apply(data);
    // if the server already advanced to the next question, keep the picked option for the gap view only
    if (data.status === 'active' && data.index !== state.index) setSelected(null);
  };

  /* ───────────── render ───────────── */

  if (stage === 'loading') {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </Screen>
    );
  }

  if (stage === 'error') {
    return (
      <Screen contentStyle={styles.center}>
        <Ionicons name="cloud-offline-outline" size={46} color={Colors.textMuted} />
        <Text style={styles.centerTitle}>Connection problem</Text>
        <Text style={styles.centerText}>{error}</Text>
        <Button title="Try again" onPress={() => { setStage('loading'); fetchState(); }} style={{ marginTop: Spacing.lg }} />
        <Button title="Go back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (stage === 'confirm') {
    const enough = balance >= entry;
    return (
      <Screen scroll>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.subjectChip}>
          <Ionicons name="albums-outline" size={16} color={Colors.primary} />
          <Text style={styles.subjectChipText}>{categoryId ? subject?.name || 'Subject' : 'Quick match · any subject'}</Text>
        </View>
        <Text style={styles.h1}>Confirm your entry</Text>
        <Text style={styles.sub}>
          10 questions, 30 seconds each. The entry fee is taken when you start searching and refunded automatically if no opponent is found.
        </Text>

        <View style={styles.card}>
          <Row label="Competition fee" value={formatMoney(fees.competition)} />
          <Row label="Platform fee" value={formatMoney(fees.platform)} />
          <View style={styles.sep} />
          <Row label="Total to pay" value={formatMoney(entry)} strong />
        </View>

        <View style={styles.prizeCard}>
          <Ionicons name="trophy" size={22} color={Colors.accent} />
          <Text style={styles.prizeText}>Winner receives <Text style={{ fontWeight: '800' }}>{formatMoney(fees.competition * 2)}</Text></Text>
        </View>

        <View style={styles.card}>
          <Row label="Wallet balance" value={formatMoney(balance)} />
          <Row label="After entry" value={formatMoney(Math.max(0, balance - entry))} muted />
        </View>

        {enough ? (
          <Button title={`Pay ${formatMoney(entry)} & find opponent`} icon="flash" size="lg" fullWidth loading={busy} onPress={onFind} />
        ) : (
          <>
            <Text style={styles.warn}>You need {formatMoney(entry - balance)} more to enter.</Text>
            <Button title="Deposit now" icon="add-circle-outline" size="lg" fullWidth onPress={() => router.push('/deposit')} />
          </>
        )}
      </Screen>
    );
  }

  if (stage === 'searching') {
    return (
      <Searching
        waited={state?.waited_s ?? 0}
        widenAt={state?.widen_s ?? 25}
        timeoutAt={state?.timeout_s ?? 90}
        subject={state?.category_name || subject?.name || null}
        busy={busy}
        onCancel={onCancel}
        tick={tick}
      />
    );
  }

  if (stage === 'invited' && state?.invite) {
    const left = Math.max(0, state.invite.seconds_left - Math.floor((nowServer() - state.server_time) / 1000) - 0);
    return (
      <Screen contentStyle={styles.center}>
        <Avatar name={state.invite.to_name} uri={state.invite.to_avatar} size={84} />
        <Text style={styles.centerTitle}>Waiting for {state.invite.to_name}</Text>
        <Text style={styles.centerText}>
          Invitation sent for {state.category_name || 'this subject'}. They have {left}s to accept. Your {formatMoney(state.fee ?? entry)} is held and refunded if they decline or do not answer.
        </Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        <Button title="Cancel invitation" variant="outline" fullWidth loading={busy} onPress={onCancelInvite} style={{ marginTop: Spacing.xl }} />
      </Screen>
    );
  }

  if (stage === 'invite_ended') {
    return (
      <Screen contentStyle={styles.center}>
        <View style={styles.timeoutIcon}><Ionicons name="close-circle-outline" size={36} color={Colors.primary} /></View>
        <Text style={styles.centerTitle}>{state?.reason === 'declined' ? 'Invitation declined' : 'No answer'}</Text>
        <Text style={styles.centerText}>
          {state?.to_name || 'The player'} {state?.reason === 'declined' ? 'is not available to play right now' : 'did not reply in time'}. Your {formatMoney(state?.refunded ?? entry)} has been refunded in full.
        </Text>
        <Button title="Search for an opponent instead" icon="search" fullWidth loading={busy} onPress={() => { setStage('confirm'); onFind(); }} style={{ marginTop: Spacing.xl }} />
        <Button title="Back to players" variant="outline" fullWidth onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
      </Screen>
    );
  }

  if (stage === 'timeout') {
    return (
      <Screen contentStyle={styles.center}>
        <View style={styles.timeoutIcon}><Ionicons name="hourglass-outline" size={34} color={Colors.primary} /></View>
        <Text style={styles.centerTitle}>No opponent right now</Text>
        <Text style={styles.centerText}>
          Nobody was available in {state?.category_name || 'this subject'}. Your {formatMoney(state?.refunded ?? entry)} has been refunded in full.
        </Text>
        <View style={styles.tips}>
          <Text style={styles.tip}>• Evenings and weekends are busiest.</Text>
          <Text style={styles.tip}>• Popular subjects match fastest.</Text>
          <Text style={styles.tip}>• Invite a friend to play you in the same subject.</Text>
        </View>
        <Button title="Try again" icon="refresh" fullWidth loading={busy} onPress={() => { setStage('confirm'); onFind(); }} style={{ marginTop: Spacing.lg }} />
        <Button title="Choose another subject" variant="outline" fullWidth onPress={() => router.replace('/(tabs)/compete')} style={{ marginTop: Spacing.md }} />
        <Button title="Find players on Telegram" variant="ghost" icon="paper-plane-outline" onPress={() => openLink(links.telegram_url, 'Telegram community')} />
      </Screen>
    );
  }

  if (stage === 'request' && state) {
    const secs = Math.max(0, Math.ceil(((state.deadline ?? 0) - nowServer()) / 1000));
    return (
      <Screen contentStyle={styles.center}>
        <Text style={styles.kicker}>MATCH FOUND{state.category_name ? ` · ${state.category_name.toUpperCase()}` : ''}</Text>
        <Avatar name={state.opponent?.name} uri={state.opponent?.avatar_url} size={84} />
        <Text style={styles.oppName}>{state.opponent?.name}</Text>
        <Text style={styles.centerText}>wants to play you for {formatMoney(state.prize)}</Text>
        <View style={styles.countPill}><Text style={styles.countText}>{secs}s to respond</Text></View>
        {state.i_accepted ? (
          <View style={{ alignItems: 'center', gap: 10, marginTop: Spacing.xl }}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.centerText}>Waiting for your opponent…</Text>
          </View>
        ) : (
          <View style={styles.reqActions}>
            <Button title="Decline" variant="outline" onPress={() => onRespond(false)} disabled={busy} style={{ flex: 1 }} />
            <Button title="Accept" onPress={() => onRespond(true)} loading={busy} style={{ flex: 1 }} />
          </View>
        )}
      </Screen>
    );
  }

  if (stage === 'play' && state?.question) return <Play state={state} nowServer={nowServer} selected={selected} onAnswer={onAnswer} lastGap={lastGap} tick={tick} />;

  return (
    <Screen contentStyle={styles.center}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </Screen>
  );
}

/* ───────────── sub components ───────────── */

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && { color: Colors.text, fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontSize: Typography.size.xl }, muted && { color: Colors.textMuted }]}>{value}</Text>
    </View>
  );
}

function Searching({ waited, widenAt, timeoutAt, subject, busy, onCancel }: {
  waited: number; widenAt: number; timeoutAt: number; subject: string | null; busy: boolean; onCancel: () => void; tick: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
  }, [pulse]);
  const ring = (delay: number) => ({
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5 + delay, 1.9] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45 - delay, 0] }),
  });
  const widened = waited >= widenAt;
  const left = Math.max(0, timeoutAt - waited);
  const pct = Math.min(100, (waited / Math.max(1, timeoutAt)) * 100);
  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.radar}>
        <Animated.View style={[styles.ring, ring(0)]} />
        <Animated.View style={[styles.ring, ring(0.2)]} />
        <View style={styles.radarCore}><Ionicons name="search" size={34} color={Colors.white} /></View>
      </View>
      <Text style={styles.centerTitle}>Finding an opponent…</Text>
      {subject ? <Text style={styles.subjectLine}>{subject}</Text> : null}
      <Text style={styles.centerText}>
        {widened
          ? 'Widening the search to other subjects so you are matched faster.'
          : subject ? `Looking for another ${subject} player.` : 'Looking for any player who is ready.'}
      </Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
      <Text style={styles.waitedNote}>Searching for {waited}s · full refund in {left}s if nobody joins</Text>
      <Button title="Cancel & refund" variant="outline" onPress={onCancel} loading={busy} style={{ marginTop: Spacing.xl, minWidth: 200 }} />
    </Screen>
  );
}

function Play({ state, nowServer, selected, onAnswer, lastGap }: {
  state: MatchState; nowServer: () => number; selected: number | null;
  onAnswer: (i: number) => void; lastGap: { index: number; correct: boolean; points: number } | null; tick: number;
}) {
  const q = state.question!;
  const secs = state.question_seconds ?? 30;
  const start = state.question_started_at ?? 0;
  const now = nowServer();
  const untilStart = start - now;
  const remaining = Math.max(0, start + secs * 1000 - now);
  const frac = Math.min(1, remaining / (secs * 1000));
  const answered = Boolean(state.me?.answered) || selected !== null;
  const mySel = state.me?.answered ? state.me.selected ?? selected : selected;
  const correctIdx = state.me?.answered ? state.me.correct_index ?? null : null;
  const waiting = untilStart > 0;

  const barColor = frac > 0.5 ? Colors.success : frac > 0.2 ? Colors.warning : Colors.error;

  return (
    <Screen contentStyle={{ paddingTop: Spacing.lg }}>
      {/* scoreboard */}
      <View style={styles.board}>
        <View style={styles.boardSide}>
          <Text style={styles.boardName} numberOfLines={1}>You</Text>
          <Text style={styles.boardScore}>{state.me?.score ?? 0}</Text>
        </View>
        <View style={styles.boardMid}>
          <Text style={styles.boardQ}>Q {(state.index ?? 0) + 1}/{state.total}</Text>
          <Text style={styles.boardTimer}>{waiting ? '–' : Math.ceil(remaining / 1000)}</Text>
        </View>
        <View style={[styles.boardSide, { alignItems: 'flex-end' }]}>
          <Text style={styles.boardName} numberOfLines={1}>{state.opponent?.name}</Text>
          <Text style={styles.boardScore}>{state.opponent?.score ?? 0}</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${waiting ? 100 : frac * 100}%`, backgroundColor: waiting ? Colors.borderStrong : barColor }]} />
      </View>

      {waiting ? (
        <View style={styles.gap}>
          {lastGap && lastGap.index === (state.index ?? 0) - 1 ? (
            <>
              <Ionicons name={lastGap.correct ? 'checkmark-circle' : 'close-circle'} size={54} color={lastGap.correct ? Colors.success : Colors.error} />
              <Text style={styles.gapTitle}>{lastGap.correct ? (lastGap.points > 0 ? `Correct  +${lastGap.points}` : 'Correct — opponent was faster') : 'Not quite'}</Text>
            </>
          ) : null}
          <Text style={styles.gapSub}>{(state.index ?? 0) === 0 ? 'Get ready…' : 'Next question'}</Text>
          <Text style={styles.gapCount}>{Math.max(1, Math.ceil(untilStart / 1000))}</Text>
        </View>
      ) : (
        <>
          <View style={styles.qCard}>
            <Text style={styles.qText}>{q.text}</Text>
          </View>
          {q.options.map((opt, i) => {
            let bg: string = Colors.surface;
            let border: string = Colors.border;
            let color: string = Colors.text;
            if (answered && correctIdx !== null) {
              if (i === correctIdx) { bg = Colors.successMuted; border = Colors.success; }
              else if (i === mySel) { bg = Colors.errorMuted; border = Colors.error; }
            } else if (i === mySel) { bg = Colors.primarySoft; border = Colors.primary; }
            return (
              <TouchableOpacity key={i} activeOpacity={0.85} disabled={answered || remaining <= 0} onPress={() => onAnswer(i)} style={[styles.opt, { backgroundColor: bg, borderColor: border }]}>
                <View style={[styles.optKey, i === mySel && { backgroundColor: Colors.primary }]}>
                  <Text style={[styles.optKeyText, i === mySel && { color: Colors.white }]}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={[styles.optText, { color }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
          {answered ? (
            <View style={styles.waitRow}>
              {state.opponent?.answered ? null : <ActivityIndicator size="small" color={Colors.primary} />}
              <Text style={styles.waitText}>
                {state.me?.correct === true
                  ? (state.me.points ? `Correct! +${state.me.points} points` : 'Correct — opponent was faster')
                  : state.me?.correct === false ? 'Wrong answer' : 'Answer sent'}
                {state.opponent?.answered ? '' : ' · waiting for opponent'}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  centerTitle: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800', marginTop: Spacing.lg, textAlign: 'center' },
  centerText: { color: Colors.textSecondary, fontSize: Typography.size.md, marginTop: 6, textAlign: 'center', lineHeight: 22 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, marginLeft: -4 },
  backText: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '600' },
  h1: { color: Colors.text, fontSize: Typography.size.xxxl, fontWeight: '800' },
  sub: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20, marginTop: 8, marginBottom: Spacing.xl },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowLabel: { color: Colors.textSecondary, fontSize: Typography.size.md },
  rowValue: { color: Colors.text, fontWeight: '700', fontSize: Typography.size.md },
  sep: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  prizeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.accentSoft, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  prizeText: { color: Colors.text, fontSize: Typography.size.md },
  warn: { color: Colors.error, fontWeight: '600', marginBottom: Spacing.md, textAlign: 'center' },

  kicker: { color: Colors.primary, fontWeight: '800', letterSpacing: 1.5, fontSize: Typography.size.sm, marginBottom: Spacing.xl },
  oppName: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '800', marginTop: Spacing.lg },
  countPill: { backgroundColor: Colors.primarySoft, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, marginTop: Spacing.lg },
  countText: { color: Colors.primary, fontWeight: '800' },
  reqActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl, width: '100%' },

  radar: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.primary },
  radarCore: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.button },
  waited: { color: Colors.primary, fontWeight: '800', fontSize: Typography.size.xl, marginTop: Spacing.md },

  board: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryDeep, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  boardSide: { flex: 1 },
  boardName: { color: Colors.whiteMuted, fontSize: Typography.size.sm, fontWeight: '600' },
  boardScore: { color: Colors.white, fontSize: 30, fontWeight: '800' },
  boardMid: { alignItems: 'center', paddingHorizontal: Spacing.md },
  boardQ: { color: Colors.whiteMuted, fontSize: Typography.size.xs, fontWeight: '700' },
  boardTimer: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceMuted, overflow: 'hidden', marginBottom: Spacing.lg },
  barFill: { height: 8, borderRadius: 4 },
  gap: { alignItems: 'center', paddingVertical: Spacing.massive },
  gapTitle: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800', marginTop: Spacing.md, textAlign: 'center' },
  gapSub: { color: Colors.textSecondary, marginTop: Spacing.lg, fontSize: Typography.size.md },
  gapCount: { color: Colors.primary, fontSize: 64, fontWeight: '900' },

  qCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, ...Shadows.soft },
  qText: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '700', lineHeight: 28 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1.5, marginBottom: Spacing.md },
  optKey: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  optKeyText: { color: Colors.textSecondary, fontWeight: '800' },
  optText: { flex: 1, fontSize: Typography.size.md, fontWeight: '600' },
  waitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: Spacing.sm },
  waitText: { color: Colors.textSecondary, fontWeight: '600' },
  subjectChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, marginBottom: Spacing.md },
  subjectChipText: { color: Colors.primary, fontWeight: '800', fontSize: Typography.size.sm },
  subjectLine: { color: Colors.primary, fontWeight: '800', fontSize: Typography.size.md, marginTop: 4 },
  progressTrack: { width: 220, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceMuted, marginTop: Spacing.lg, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  timeoutIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  tips: { alignSelf: 'stretch', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  tip: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 19 },
  waitedNote: { color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: Spacing.md, textAlign: 'center' },
});
