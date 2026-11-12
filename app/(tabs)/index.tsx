/**
 * Home dashboard — wallet, quick play, top players, community and legal links.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, RefreshControl, ScrollView, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { bannersService } from '@/services/banners';
import { leaderboardService } from '@/services/leaderboard';
import { notificationsService } from '@/services/notifications';
import { settingsService } from '@/services/settings';
import { useAuth } from '@/contexts/AuthContext';
import { useLinks, openLink, openSupport } from '@/hooks/useLinks';
import type { Banner, LeaderboardEntry } from '@/types';

const BANNER_W = Dimensions.get('window').width - Spacing.xl * 2;

export default function HomeScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const links = useLinks();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [unread, setUnread] = useState(0);
  const [fees, setFees] = useState({ entry: 23, prize: 40 });
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * (BANNER_W + Spacing.md), animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [banners.length]);

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
            <Text style={styles.sub}>Ready to compete?</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bell} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {unread > 0 ? <View style={styles.bellDot} /> : null}
        </TouchableOpacity>
      </View>

      {/* wallet */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wallet}>
        <Text style={styles.walletLabel}>Wallet balance</Text>
        <Text style={styles.walletValue}>{formatMoney(profile?.balance_zmw)}</Text>
        <View style={styles.walletActions}>
          <TouchableOpacity style={[styles.walletBtn, styles.walletBtnSolid]} onPress={() => router.push('/deposit')} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={18} color={Colors.primaryDeep} />
            <Text style={styles.walletBtnSolidText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.walletBtn, styles.walletBtnGhost]} onPress={() => router.push('/withdraw')} activeOpacity={0.85}>
            <Ionicons name="arrow-up-circle-outline" size={18} color={Colors.white} />
            <Text style={styles.walletBtnGhostText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* quick play */}
      <TouchableOpacity style={styles.play} activeOpacity={0.9} onPress={() => router.push('/match')}>
        <View style={styles.playIcon}>
          <Ionicons name="flash" size={26} color={Colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.playTitle}>Find a match</Text>
          <Text style={styles.playSub}>
            Entry {formatMoney(fees.entry)} · Winner takes {formatMoney(fees.prize)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* banners */}
      {banners.length > 0 ? (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled={false}
            snapToInterval={BANNER_W + Spacing.md}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + Spacing.md)))}
            style={styles.bannerScroll}
          >
            {banners.map((b) => (
              <View key={b.id} style={styles.bannerCard}>
                {b.image_url ? (
                  <Image source={{ uri: b.image_url }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={[Colors.primary, Colors.primaryDeep]} style={styles.bannerImage} />
                )}
                <View style={styles.bannerOverlay}>
                  <Text style={styles.bannerTitle} numberOfLines={2}>{b.title}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          {banners.length > 1 ? (
            <View style={styles.dots}>
              {banners.map((_, i) => <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />)}
            </View>
          ) : null}
        </>
      ) : null}

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
          <Text style={styles.tgSub}>Chat with players, ask questions and get announcements.</Text>
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

  wallet: { borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadows.button },
  walletLabel: { color: Colors.whiteMuted, fontSize: Typography.size.sm, fontWeight: '600', letterSpacing: 0.4 },
  walletValue: { color: Colors.white, fontSize: 38, fontWeight: '800', marginTop: 4, marginBottom: Spacing.lg },
  walletActions: { flexDirection: 'row', gap: Spacing.md },
  walletBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: BorderRadius.md },
  walletBtnSolid: { backgroundColor: Colors.white },
  walletBtnSolidText: { color: Colors.primaryDeep, fontWeight: '800' },
  walletBtnGhost: { backgroundColor: Colors.whiteFaint, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  walletBtnGhostText: { color: Colors.white, fontWeight: '700' },

  play: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, ...Shadows.card },
  playIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  playTitle: { color: Colors.text, fontSize: Typography.size.lg, fontWeight: '800' },
  playSub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: 2 },

  bannerScroll: { marginBottom: Spacing.sm },
  bannerCard: { width: BANNER_W, height: 140, borderRadius: BorderRadius.lg, overflow: 'hidden', marginRight: Spacing.md, backgroundColor: Colors.primaryDeep },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: 'rgba(29,18,68,0.55)' },
  bannerTitle: { color: Colors.white, fontWeight: '700', fontSize: Typography.size.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.borderStrong },
  dotActive: { backgroundColor: Colors.primary, width: 18 },

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
