/**
 * Large promo banners at the top of Home. Auto-advances, swipeable, with a title, a short line and a button.
 * A banner's destination can be: a web link, an app route ("/deposit"), or "category:<id>".
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import type { Banner } from '@/types';

const GAP = Spacing.md;
const W = Dimensions.get('window').width - Spacing.xl * 2;
export const BANNER_HEIGHT = Math.round(W * 0.62);

interface Props {
  banners: Banner[];
  onPress: (b: Banner) => void;
}

export function BannerCarousel({ banners, onPress }: Props) {
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const idx = useRef(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      const next = (idx.current + 1) % banners.length;
      idx.current = next;
      ref.current?.scrollTo({ x: next * (W + GAP), animated: true });
      setIndex(next);
    }, 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (W + GAP));
    idx.current = i;
    setIndex(i);
  };

  if (banners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={ref}
        horizontal
        snapToInterval={W + GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
      >
        {banners.map((b) => {
          const label = b.button_text || undefined;
          const desc = b.description || undefined;
          const hasAction = Boolean(b.destination || b.link_url);
          return (
            <TouchableOpacity key={b.id} activeOpacity={0.92} onPress={() => onPress(b)} style={styles.card}>
              {b.image_url ? (
                <Image source={{ uri: b.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[Colors.primary, Colors.primaryDeep]} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient colors={['rgba(20,8,50,0)', 'rgba(20,8,50,0.88)']} style={styles.shade} />
              <View style={styles.text}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>{b.title}</Text>
                  {desc ? <Text style={styles.desc} numberOfLines={1}>{desc}</Text> : null}
                </View>
                {hasAction ? (
                  <View style={styles.cta}><Text style={styles.ctaText}>{label || 'Open'}</Text></View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  card: { width: W, height: BANNER_HEIGHT, borderRadius: 24, overflow: 'hidden', marginRight: GAP, backgroundColor: Colors.primaryDeep, ...Shadows.card },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  text: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  title: { color: Colors.white, fontSize: Typography.size.xl, fontWeight: '800' },
  desc: { color: Colors.whiteMuted, fontSize: Typography.size.sm, marginTop: 3 },
  cta: { backgroundColor: Colors.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: BorderRadius.full },
  ctaText: { color: Colors.primaryDeep, fontWeight: '800', fontSize: Typography.size.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.borderStrong },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
});
