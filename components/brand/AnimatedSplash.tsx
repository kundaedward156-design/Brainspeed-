/**
 * Full-screen animated splash.
 *
 * Mirrors the supplied splash artwork (lavender grid background, mascot tile on a shelf,
 * "QUIVANTA Quiz" title) but every study icon — books, graduation caps, bulbs and
 * reward coins — is a live element that drifts, bobs and rotates around the mascot.
 * Below the tagline, short lines taken from the product brief rotate in and out.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppConfig } from '@/constants/config';

type Kind = 'book' | 'cap' | 'bulb' | 'coin' | 'dot';

interface Floater {
  x: number; // 0..1 of screen width (centre)
  y: number; // 0..1 of screen height (centre)
  kind: Kind;
  size: number;
  opacity: number;
  rise: number; // vertical travel in px
  sway: number; // horizontal travel in px
  tilt: number; // degrees
  duration: number;
  delay: number;
}

// Positions follow the artwork.
const FLOATERS: Floater[] = [
  { x: 0.49, y: 0.056, kind: 'cap', size: 34, opacity: 0.5, rise: 10, sway: 6, tilt: 8, duration: 3800, delay: 0 },
  { x: 0.68, y: 0.085, kind: 'cap', size: 38, opacity: 0.95, rise: 14, sway: 8, tilt: 10, duration: 4200, delay: 150 },
  { x: 0.5, y: 0.153, kind: 'cap', size: 36, opacity: 0.9, rise: 12, sway: 7, tilt: 9, duration: 3600, delay: 300 },
  { x: 0.7, y: 0.173, kind: 'bulb', size: 20, opacity: 0.35, rise: 8, sway: 4, tilt: 6, duration: 3400, delay: 450 },
  { x: 0.155, y: 0.2, kind: 'dot', size: 12, opacity: 0.45, rise: 8, sway: 6, tilt: 0, duration: 3000, delay: 100 },
  { x: 0.86, y: 0.205, kind: 'coin', size: 34, opacity: 0.9, rise: 12, sway: 6, tilt: 0, duration: 4000, delay: 250 },
  { x: 0.086, y: 0.288, kind: 'book', size: 44, opacity: 0.95, rise: 16, sway: 8, tilt: 12, duration: 4600, delay: 350 },
  { x: 0.908, y: 0.298, kind: 'bulb', size: 32, opacity: 0.95, rise: 12, sway: 6, tilt: 8, duration: 3900, delay: 500 },
  { x: 0.077, y: 0.418, kind: 'bulb', size: 26, opacity: 0.35, rise: 10, sway: 5, tilt: 7, duration: 3500, delay: 200 },
  { x: 0.88, y: 0.4, kind: 'dot', size: 10, opacity: 0.4, rise: 8, sway: 5, tilt: 0, duration: 3200, delay: 650 },
  { x: 0.927, y: 0.463, kind: 'cap', size: 32, opacity: 0.95, rise: 12, sway: 6, tilt: 10, duration: 4300, delay: 400 },
  { x: 0.887, y: 0.559, kind: 'coin', size: 34, opacity: 0.9, rise: 14, sway: 6, tilt: 0, duration: 4100, delay: 550 },
  { x: 0.119, y: 0.553, kind: 'bulb', size: 32, opacity: 0.95, rise: 12, sway: 6, tilt: 8, duration: 3700, delay: 300 },
  { x: 0.91, y: 0.845, kind: 'dot', size: 12, opacity: 0.45, rise: 8, sway: 5, tilt: 0, duration: 3100, delay: 700 },
  { x: 0.105, y: 0.868, kind: 'coin', size: 34, opacity: 0.85, rise: 14, sway: 6, tilt: 0, duration: 4400, delay: 450 },
  { x: 0.737, y: 0.88, kind: 'book', size: 40, opacity: 0.95, rise: 16, sway: 8, tilt: 12, duration: 4700, delay: 600 },
  { x: 0.262, y: 0.938, kind: 'book', size: 40, opacity: 0.95, rise: 16, sway: 8, tilt: 12, duration: 4500, delay: 500 },
  { x: 0.88, y: 0.94, kind: 'coin', size: 34, opacity: 0.85, rise: 12, sway: 6, tilt: 0, duration: 3900, delay: 650 },
];

// Lines from the product brief, shown one at a time under the tagline.
const BRIEF_LINES = [
  'Head-to-head quiz matches',
  'Same question. Same time. Fastest correct answer scores.',
  'Win real rewards in Kwacha',
  'Climb the Top 10 leaderboard',
];

const PURPLE = '#6A35D0';
const DEEP = '#2D025B';

function FloaterView({ f, W, H }: { f: Floater; W: number; H: number }) {
  const appear = useRef(new Animated.Value(0)).current;
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 700, delay: 250 + f.delay, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: f.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: f.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [appear, t, f.delay, f.duration]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [f.rise / 2, -f.rise / 2] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-f.sway / 2, f.sway / 2] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [`${-f.tilt}deg`, `${f.tilt}deg`] });

  let glyph: React.ReactNode;
  switch (f.kind) {
    case 'book':
      glyph = <Ionicons name="book" size={f.size} color={PURPLE} />;
      break;
    case 'cap':
      glyph = <Ionicons name="school" size={f.size} color={PURPLE} />;
      break;
    case 'bulb':
      glyph = <Ionicons name="bulb" size={f.size} color={PURPLE} />;
      break;
    case 'coin':
      glyph = (
        <View style={[styles.coin, { width: f.size, height: f.size, borderRadius: f.size / 2 }]}>
          <Ionicons name="stats-chart" size={f.size * 0.5} color={PURPLE} />
        </View>
      );
      break;
    default:
      glyph = <View style={{ width: f.size, height: f.size, borderRadius: f.size / 2, backgroundColor: PURPLE }} />;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: f.x * W - f.size / 2,
        top: f.y * H - f.size / 2,
        opacity: Animated.multiply(appear, f.opacity),
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    >
      {glyph}
    </Animated.View>
  );
}

export function AnimatedSplash({ onLayout }: { onLayout?: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const enter = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;
  const [lineIdx, setLineIdx] = React.useState(0);

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [enter, bob]);

  // Rotate the brief lines: fade in → hold → fade out → next
  useEffect(() => {
    let alive = true;
    let i = 0;
    const cycle = () => {
      if (!alive) return;
      setLineIdx(i % BRIEF_LINES.length);
      Animated.sequence([
        Animated.timing(lineOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(lineOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        i += 1;
        cycle();
      });
    };
    const start = setTimeout(cycle, 900);
    return () => {
      alive = false;
      clearTimeout(start);
    };
  }, [lineOpacity]);

  const GRID = 54;
  const cols = Math.ceil(W / GRID) + 1;
  const rows = Math.ceil(H / GRID) + 1;
  const grid = useMemo(
    () => (
      <>
        {Array.from({ length: cols }).map((_, i) => (
          <View key={`c${i}`} style={[styles.vLine, { left: i * GRID, height: H }]} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <View key={`r${i}`} style={[styles.hLine, { top: i * GRID, width: W }]} />
        ))}
      </>
    ),
    [cols, rows, W, H]
  );

  const tileW = W * 0.68;
  const tileH = tileW * 1.062;
  const tileTop = H * 0.4 - tileH / 2;
  const shelfW = W * 0.79;
  const shelfTop = tileTop + tileH + H * 0.012;

  const tileScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [5, -5] });
  const shadowScale = bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <LinearGradient
        colors={['#F4F2FF', '#E8E3F8', '#E3D9FB']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {grid}

      {FLOATERS.map((f, i) => (
        <FloaterView key={i} f={f} W={W} H={H} />
      ))}

      {/* shelf */}
      <Animated.View
        style={[
          styles.shelf,
          { width: shelfW, left: (W - shelfW) / 2, top: shelfTop, opacity: enter, transform: [{ scaleX: shadowScale }] },
        ]}
      />

      {/* mascot tile */}
      <Animated.View
        style={{
          position: 'absolute',
          left: (W - tileW) / 2,
          top: tileTop,
          width: tileW,
          height: tileH,
          opacity: enter,
          transform: [{ scale: tileScale }, { translateY: bobY }],
          shadowColor: DEEP,
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.22,
          shadowRadius: 22,
          elevation: 10,
        }}
      >
        <Image source={require('@/assets/mascot-tile.png')} style={{ width: tileW, height: tileH }} resizeMode="contain" />
      </Animated.View>

      {/* title */}
      <Animated.View style={[styles.titleWrap, { top: H * 0.74, opacity: enter }]}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          QUIVANTA <Text style={styles.titleLight}>Quiz</Text>
        </Text>
        <Text style={styles.tagline}>{AppConfig.slogan}</Text>
        <View style={styles.lineBox}>
          <Animated.Text style={[styles.briefLine, { opacity: lineOpacity }]}>{BRIEF_LINES[lineIdx]}</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  vLine: { position: 'absolute', top: 0, width: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(106,53,208,0.07)' },
  hLine: { position: 'absolute', left: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(106,53,208,0.07)' },
  coin: {
    borderWidth: 2,
    borderColor: PURPLE,
    backgroundColor: 'rgba(106,53,208,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelf: {
    position: 'absolute',
    height: 54,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  titleWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  title: { color: DEEP, fontSize: 36, fontWeight: '900', letterSpacing: 0.5 },
  titleLight: { fontWeight: '800' },
  tagline: { color: DEEP, fontSize: 18, fontWeight: '500', marginTop: 10 },
  lineBox: { height: 44, marginTop: 18, justifyContent: 'center', paddingHorizontal: 12 },
  briefLine: { color: PURPLE, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
});
