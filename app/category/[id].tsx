/**
 * One subject: its cover, how many have played, who is waiting, and the head-to-head duel.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { subjectLook } from '@/constants/subjects';
import { formatCount } from '@/utils/format';
import { categoriesService } from '@/services/categories';
import { settingsService } from '@/services/settings';
import { useAuth } from '@/contexts/AuthContext';
import { OnlinePlayers } from '@/components/home/OnlinePlayers';
import type { Subject } from '@/types';

export default function SubjectScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState({ competition: 20, platform: 3 });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const tick = async () => {
        const [list, f] = await Promise.all([categoriesService.listWithStats(false), settingsService.getPlatformFees()]);
        if (!alive) return;
        setSubject(list.data.find((s) => s.id === id) ?? null);
        setFees({ competition: f.data.competition_fee_zmw, platform: f.data.platform_fee_zmw });
        setLoading(false);
      };
      tick();
      const t = setInterval(tick, 15000);
      return () => { alive = false; clearInterval(t); };
    }, [id])
  );

  if (loading) {
    return <Screen contentStyle={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></Screen>;
  }
  if (!subject) {
    return (
      <Screen contentStyle={styles.center}>
        <Ionicons name="alert-circle-outline" size={44} color={Colors.textMuted} />
        <Text style={styles.missing}>This subject is no longer available.</Text>
        <Button title="Back" variant="outline" onPress={() => router.back()} style={{ marginTop: Spacing.lg }} />
      </Screen>
    );
  }

  const look = subjectLook(subject);
  const entry = fees.competition + fees.platform;
  const prize = fees.competition * 2;
  const balance = Number(profile?.balance_zmw ?? 0);

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ padding: 0 }}>
      <View style={styles.cover}>
        {subject.image_url ? (
          <Image source={{ uri: subject.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
            <View style={styles.bigIcon}><Ionicons name={look.icon} size={96} color="rgba(255,255,255,0.28)" /></View>
          </LinearGradient>
        )}
        <LinearGradient colors={['rgba(20,8,50,0.35)', 'rgba(20,8,50,0)', 'rgba(20,8,50,0.85)']} style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.coverText}>
          <Text style={styles.name}>{subject.name}</Text>
          {subject.description ? <Text style={styles.desc} numberOfLines={2}>{subject.description}</Text> : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.stats}>
          <Stat icon="people" value={subject.played > 0 ? formatCount(subject.played) : 'New'} label="players" />
          <View style={styles.statSep} />
          <Stat icon="radio-button-on" value={String(subject.waiting)} label="waiting now" live={subject.waiting > 0} />
          <View style={styles.statSep} />
          <Stat icon="help-circle" value="10" label="questions" />
        </View>

        {subject.waiting > 0 && subject.playable ? (
          <View style={styles.liveNote}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{subject.waiting === 1 ? 'A player is' : `${subject.waiting} players are`} waiting for an opponent — you will be matched straight away.</Text>
          </View>
        ) : null}

        <View style={styles.duel}>
          <Text style={styles.duelKicker}>HEAD-TO-HEAD DUEL</Text>
          <View style={styles.duelRow}>
            <View style={styles.duelCell}>
              <Text style={styles.duelLabel}>Entry</Text>
              <Text style={styles.duelValue}>{formatMoney(entry)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} />
            <View style={styles.duelCell}>
              <Text style={styles.duelLabel}>Winner takes</Text>
              <Text style={[styles.duelValue, { color: Colors.success }]}>{formatMoney(prize)}</Text>
            </View>
          </View>
          <Text style={styles.duelFoot}>10 questions · 30 seconds each · your balance {formatMoney(balance)}</Text>
        </View>

        {subject.playable ? (
          <Button
            title={`Play ${subject.name}`}
            icon="flash"
            size="lg"
            fullWidth
            onPress={() => router.push({ pathname: '/match', params: { category: subject.id } })}
          />
        ) : (
          <View style={styles.soon}>
            <Ionicons name="construct-outline" size={20} color={Colors.warning} />
            <Text style={styles.soonText}>
              This subject is almost ready — {subject.questions} of {subject.questions_needed} questions added. Check back soon.
            </Text>
          </View>
        )}

        {subject.playable ? <OnlinePlayers subject={subject} /> : null}

        <View style={styles.assure}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
          <Text style={styles.assureText}>If no opponent is found within 90 seconds, your entry fee is refunded in full automatically.</Text>
        </View>
      </View>
    </Screen>
  );
}

function Stat({ icon, value, label, live }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; live?: boolean }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={live ? Colors.success : Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  missing: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.size.md },
  cover: { height: 250, backgroundColor: Colors.primaryDeep, justifyContent: 'flex-end' },
  bigIcon: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', top: 48, left: Spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,8,50,0.45)', alignItems: 'center', justifyContent: 'center' },
  coverText: { padding: Spacing.xl },
  name: { color: Colors.white, fontSize: 30, fontWeight: '800' },
  desc: { color: Colors.whiteMuted, fontSize: Typography.size.sm, marginTop: 4 },
  body: { padding: Spacing.xl, marginTop: -Spacing.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.background },
  stats: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, ...Shadows.soft },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.size.xs },
  statSep: { width: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  liveNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.successMuted, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { flex: 1, color: Colors.text, fontSize: Typography.size.sm, lineHeight: 18 },
  duel: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  duelKicker: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: '800', letterSpacing: 1.1 },
  duelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: Spacing.lg },
  duelCell: { alignItems: 'center' },
  duelLabel: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  duelValue: { color: Colors.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
  duelFoot: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center' },
  soon: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.warningMuted, padding: Spacing.lg, borderRadius: BorderRadius.md },
  soonText: { flex: 1, color: Colors.text, fontSize: Typography.size.sm, lineHeight: 19 },
  assure: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.lg },
  assureText: { flex: 1, color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 18 },
});
