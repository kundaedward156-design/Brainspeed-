import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function AdminCompetitions() {
  return (
    <Screen scroll contentStyle={{  }}>
      <Header title="Competitions" />
      <Text style={styles.hint}>ID · Players · Quiz · Scores · Winner · Status · Time</Text>
      <EmptyState
        icon="flash-outline"
        title="No competitions yet"
        message="Match history will appear here as players compete."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.whiteDim, fontSize: Typography.size.sm, marginBottom: Spacing.lg },
});
