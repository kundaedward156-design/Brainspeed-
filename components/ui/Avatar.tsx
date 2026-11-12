import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { initials } from '@/utils/format';

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  tone?: 'primary' | 'neutral' | 'accent';
}

export function Avatar({ name, uri, size = 44, tone = 'primary' }: AvatarProps) {
  const bg = tone === 'primary' ? Colors.primary : tone === 'accent' ? Colors.accent : Colors.surfaceMuted;
  const fg = tone === 'neutral' ? Colors.primary : Colors.white;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: fg, fontWeight: '800', fontSize: size * 0.38 }}>{initials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
