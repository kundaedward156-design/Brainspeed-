/**
 * Home dashboard — wallet, quick play, top players, community and legal links.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { SubjectGrid } from '@/components/home/SubjectGrid';
import { SubjectTile } from '@/components/home/SubjectTile';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { bannersService } from '@/services/banners';
import { leaderboardService } from '@/services/leaderboard';
import { notificationsService } from '@/services/notifications';
import { settingsService } from '@/services/settings';
import { useAuth } from '@/contexts/AuthContext';
import { useLinks, openLink, openSupport } from '@/hooks/useLinks';
import { useSubjects } from '@/hooks/useSubjects';
import type { Banner, LeaderboardEntry, Subject } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const links = useLinks();
  const { subjects, reload } = useSubjects();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [unread, setUnread] = useState(0);
  const [fees, setFees] = useState({ entry: 23, prize: 40 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [b, lb, f] = await Promise.all([
      bannersService.listActive().catch(() => ({ data: [] as Banner[] })),
      leaderboardService.get(3),
      settingsService.getPlatformFees(),
    ]);
    setBanners(b.data ?? []);
    setTop(lb.data.top);
    setFees({ entry: f.data.platform_fee_zmw + f.data.competition_fee_zmw, prize: f.data.competition_fee_zmw * 2 });
    if (profile?.id) setUnread(await notificationsService.unreadCount(profile.id));
    await refresh();
  }, [profile?.id, refresh]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), reload()]);
    setRefreshing(false);
  };

  const openSubject = (s: Subject) => router.push({ pathname: '/category/[id]', params: { id: s.id } });

  const onBanner = (b: Banner) => {
    const dest = (b.destination || b.link_url || '').trim();
    if (!dest) return;
    if (dest.startsWith('category:')) return router.push({ pathname: '/category/[id]', params: { id: dest.slice(9) } });
    if (dest.startsWith('/')) return router.push(dest as any);
    openLink(dest, b.title);
  };

  const recent = subjects
    .filter((s) => s.my_last_played)
    .sort((a, b) => new Date(b.my_last_played!).getTime() - new Date(a.my_last_played!).getTime())
    .slice(0, 8);
  const hot = [...subjects].sort((a, b) => b.played - a.played || b.waiting - a.waiting).slice(0, 6);
  const first = (profile?.full_name || '').split(' ')[0];

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.who} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
          <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={46} />
          <View>
            <Text style={styles.hello}>Hello{first ? `, ${first}` : ''}</Text>
            <Text style={styles.sub}>Pick a subject and compete</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bell} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {unread > 0 ? <View style={styles.bellDot} /> : null}
        </TouchableOpacity>
      </View>

      {/* wallet */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wallet}>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletLabel}>Wallet balance</Text>
          <Text style={styles.walletValue}>{formatMoney(profile?.balance_zmw)}</Text>
        </View>
        <View style={styles.walletActions}>
          <TouchableOpacity style={[styles.walletBtn, styles.walletBtnSolid]} onPress={() => router.push('/deposit')} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color={Colors.primaryDeep} />
            <Text style={styles.walletBtnSolidText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.walletBtn, styles.walletBtnGhost]} onPress={() => router.push('/withdraw')} activeOpacity={0.85}>
            <Ionicons name="arrow-up" size={16} color={Colors.white} />
            <Text style={styles.walletBtnGhostText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* large banners */}
      <BannerCarousel banners={banners} onPress={onBanner} />

      {/* continue playing */}
      {recent.length > 0 ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Continue playing</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/compete')}><Text style={styles.sectionLink}>View all</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recent.map((s) => (
              <SubjectTile key={s.id} subject={s} size={84} showPlayers={false} onPress={() => openSubject(s)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* hot subjects */}
      {subjects.length > 6 ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Hot subjects</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refresh}>
              <Text style={styles.sectionLink}>Refresh</Text>
              <Ionicons name="refresh" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.caption}>Entry {formatMoney(fees.entry)} · Winner takes {formatMoney(fees.prize)} · 10 questions</Text>
          <SubjectGrid items={hot} onPress={openSubject} />
        </>
      ) : null}

      {/* all subjects */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>{subjects.length > 6 ? 'All subjects' : 'Subjects'}</Text>
        <TouchableOpacity onPress={() => router.push('/match')}>
          <Text style={styles.sectionLink}>Quick match</Text>
        </TouchableOpacity>
      </View>
      {subjects.length > 6 ? null : (
        <Text style={styles.caption}>Entry {formatMoney(fees.entry)} · Winner takes {formatMoney(fees.prize)} · 10 questions</Text>
      )}
      {subjects.length === 0 ? (
        <View style={styles.card}><Text style={styles.empty}>Subjects will appear here as soon as they are added.</Text></View>
      ) : (
        <SubjectGrid items={subjects} onPress={openSubject} />
      )}

      {/* top players */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Top players</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/leaderboard')}>
          <Text style={styles.sectionLink}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {top.length === 0 ? (
          <Text style={styles.empty}>No rankings yet — play a match to get on the board.</Text>
        ) : (
          top.map((p, i) => (
            <View key={p.user_id} style={[styles.rankRow, i < top.length - 1 && styles.divider]}>
              <Text style={[styles.rankNo, i === 0 && { color: Colors.accent }]}>{p.rank}</Text>
              <Avatar name={p.name} uri={p.avatar_url} size={36} tone="neutral" />
              <Text style={styles.rankName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.rankPts}>{p.points} pts</Text>
            </View>
          ))
        )}
      </View>

      {/* community */}
      <TouchableOpacity style={styles.telegram} activeOpacity={0.9} onPress={() => openLink(links.telegram_url, 'Telegram community')}>
        <View style={styles.tgIcon}>
          <Ionicons name="paper-plane" size={22} color={Colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tgTitle}>Join our Telegram community</Text>
          <Text style={styles.tgSub}>Find opponents, ask questions and get announcements.</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={Colors.primary} />
      </TouchableOpacity>

      {/* footer links */}
      <View style={styles.footerLinks}>
        <TouchableOpacity onPress={() => openLink(links.privacy_url, 'Privacy Policy')}><Text style={styles.footerLink}>Privacy Policy</Text></TouchableOpacity>
        <Text style={styles.footerDot}>•</Text>
        <TouchableOpacity onPress={() => openLink(links.terms_url, 'Terms of Service')}><Text style={styles.footerLink}>Terms</Text></TouchableOpacity>
        <Text style={styles.footerDot}>•</Text>
        <TouchableOpacity onPress={() => openSupport(links.support_email)}><Text style={styles.footerLink}>Support</Text></TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hello: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800' },
  sub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: 1 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  bellDot: { position: 'absolute', top: 11, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.error, borderWidth: 1.5, borderColor: Colors.surface },

  wallet: { borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadows.button },
  walletLabel: { color: Colors.whiteMuted, fontSize: Typography.size.xs, fontWeight: '600', letterSpacing: 0.4 },
  walletValue: { color: Colors.white, fontSize: 28, fontWeight: '800', marginTop: 2 },
  walletActions: { gap: 8 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: BorderRadius.full, minWidth: 104 },
  walletBtnSolid: { backgroundColor: Colors.white },
  walletBtnSolidText: { color: Colors.primaryDeep, fontWeight: '800', fontSize: Typography.size.sm },
  walletBtnGhost: { backgroundColor: Colors.whiteFaint, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  walletBtnGhostText: { color: Colors.white, fontWeight: '700', fontSize: Typography.size.sm },

  recentRow: { gap: Spacing.md, paddingBottom: Spacing.sm, marginBottom: Spacing.md },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caption: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: -6, marginBottom: Spacing.md },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  section: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '800' },
  sectionLink: { color: Colors.primary, fontWeight: '700', fontSize: Typography.size.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  empty: { color: Colors.textMuted, paddingVertical: Spacing.lg, textAlign: 'center', fontSize: Typography.size.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rankNo: { width: 20, color: Colors.textSecondary, fontWeight: '800', fontSize: Typography.size.md, textAlign: 'center' },
  rankName: { flex: 1, color: Colors.text, fontWeight: '600' },
  rankPts: { color: Colors.primary, fontWeight: '800' },

  telegram: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primarySoft, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl },
  tgIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  tgTitle: { color: Colors.text, fontWeight: '800', fontSize: Typography.size.md },
  tgSub: { color: Colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2, lineHeight: 16 },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: Spacing.lg },
  footerLink: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: '600' },
  footerDot: { color: Colors.textMuted },
});
