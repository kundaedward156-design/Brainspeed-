import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Spacing } from '@/constants/theme';
import { SubjectTile } from '@/components/home/SubjectTile';
import type { Subject } from '@/types';

const COLS = 3;
const GAP = Spacing.md;
export const GRID_TILE = Math.floor((Dimensions.get('window').width - Spacing.xl * 2 - GAP * (COLS - 1)) / COLS);

export function SubjectGrid({ items, onPress }: { items: Subject[]; onPress: (s: Subject) => void }) {
  return (
    <View style={styles.grid}>
      {items.map((s) => (
        <View key={s.id} style={{ width: GRID_TILE }}>
          <SubjectTile subject={s} size={GRID_TILE} onPress={() => onPress(s)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: Spacing.lg, marginBottom: Spacing.lg },
});
