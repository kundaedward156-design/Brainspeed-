/**
 * The square cover for a subject: the admin's image when there is one,
 * otherwise a coloured gradient with the subject icon. Optional "players" pill like a game store.
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { subjectLook } from '@/constants/subjects';
import { formatCount } from '@/utils/format';
import type { Subject } from '@/types';

interface Props {
  subject: Subject;
  size?: number; // fixed square size; omit to fill the parent width
  showPlayers?: boolean;
  showLabel?: boolean;
  onPress?: () => void;
}

export function SubjectTile({ subject, size, showPlayers = true, showLabel = true, onPress }: Props) {
  const look = subjectLook(subject);
  const dim = size ? { width: size } : { width: '100%' as const };
  const live = subject.waiting > 0;

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={[styles.wrap, dim]}>
      <View style={[styles.cover, size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 }]}>
        {subject.image_url ? (
          <Image source={{ uri: subject.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={look.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
            <View style={styles.iconWrap}>
              <Ionicons name={look.icon} size={size ? size * 0.42 : 44} color="rgba(255,255,255,0.95)" />
            </View>
          </LinearGradient>
        )}

        {live ? (
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{subject.waiting} waiting</Text>
          </View>
        ) : null}

        {!subject.playable ? (
          <View style={styles.soon}>
            <Text style={styles.soonText}>Coming soon</Text>
          </View>
        ) : null}

        {showPlayers ? (
          <View style={styles.players}>
            <Ionicons name="people-outline" size={12} color={Colors.white} />
            <Text style={styles.playersText}>{subject.played > 0 ? formatCount(subject.played) : 'New'}</Text>
          </View>
        ) : null}
      </View>
      {showLabel ? <Text style={styles.label} numberOfLines={1}>{subject.name}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  cover: { borderRadius: 22, overflow: 'hidden', backgroundColor: Colors.surfaceMuted, ...Shadows.soft },
  iconWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.text, fontSize: Typography.size.sm, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  players: {
    position: 'absolute', right: 7, bottom: 7, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(20,10,50,0.62)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  playersText: { color: Colors.white, fontSize: Typography.size.xs, fontWeight: '700' },
  live: {
    position: 'absolute', left: 7, top: 7, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(18,160,92,0.92)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  liveText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  soon: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(29,18,68,0.55)', alignItems: 'center', justifyContent: 'center' },
  soonText: { color: Colors.white, fontWeight: '800', fontSize: Typography.size.sm },
});
