/**
 * Auto-rotating promo banners from bannersService
 * When admin adds/activates banners in Supabase, they appear and swap here
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import type { Banner } from '@/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.xl * 2;

interface PromoBannerProps {
  banners?: Banner[];
  loading?: boolean;
  onPress?: (banner: Banner) => void;
}

export function PromoBanner({ banners = [], loading, onPress }: PromoBannerProps) {
  const active = banners.filter((b) => b.active);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active.length <= 1) return;
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      setIndex((i) => (i + 1) % active.length);
    }, AppConfig.bannerRotateMs);
    return () => clearInterval(id);
  }, [active.length, fade]);

  useEffect(() => {
    setIndex(0);
  }, [active.length]);

  if (loading) {
    return (
      <View style={[styles.container, styles.skeleton]}>
        <View style={styles.skeletonBar} />
        <View style={[styles.skeletonBar, { width: '55%', marginTop: 10 }]} />
      </View>
    );
  }

  const banner = active[index];

  if (!banner) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.blueDark, Colors.navy]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.tag}>BRAINSPEED</Text>
          <Text style={styles.title}>Think fast. Compete smart.</Text>
          <Text style={styles.subtitle}>Head-to-head quizzes with real ZMW rewards.</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fade }}>
        <TouchableOpacity activeOpacity={0.92} onPress={() => onPress?.(banner)}>
          {banner.image_url ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: banner.image_url }} style={styles.image} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(6,16,31,0.85)']}
                style={styles.imageOverlay}
              >
                <Text style={styles.title}>{banner.title}</Text>
                {banner.description ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {banner.description}
                  </Text>
                ) : null}
              </LinearGradient>
            </View>
          ) : (
            <LinearGradient
              colors={[Colors.blueDark, Colors.navy]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <Text style={styles.tag}>FEATURED</Text>
              <Text style={styles.title}>{banner.title}</Text>
              {banner.description ? (
                <Text style={styles.subtitle}>{banner.description}</Text>
              ) : null}
            </LinearGradient>
          )}
        </TouchableOpacity>
      </Animated.View>
      {active.length > 1 ? (
        <View style={styles.dots}>
          {active.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  gradient: {
    padding: Spacing.xl,
    minHeight: 132,
    justifyContent: 'center',
  },
  imageWrap: {
    height: 148,
    width: CARD_WIDTH,
    backgroundColor: Colors.navy,
  },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  tag: {
    color: Colors.gold,
    fontSize: Typography.size.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.white,
    fontSize: Typography.size.xl,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: { color: Colors.whiteMuted, fontSize: Typography.size.sm },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderStrong,
  },
  dotActive: { backgroundColor: Colors.gold, width: 16 },
  skeleton: {
    backgroundColor: Colors.surfaceMuted,
    minHeight: 120,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  skeletonBar: {
    height: 14,
    width: '80%',
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
});
