import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography } from '@/constants/theme';

const ITEMS = [
  {
    title: 'Categories',
    desc: 'Add, edit, deactivate · upload image',
    icon: 'grid-outline' as const,
  },
  {
    title: 'Questions',
    desc: 'Options, correct answer, time, points, image',
    icon: 'help-circle-outline' as const,
  },
  {
    title: 'Quizzes',
    desc: 'Create quiz, assign questions, activate',
    icon: 'list-outline' as const,
  },
];

export default function AdminContent() {
  return (
    <Screen scroll contentStyle={{  }}>
      <Header title="Content" />
      <Text style={styles.hint}>Manage quiz content for the player app.</Text>
      {ITEMS.map((item) => (
        <Card key={item.title} style={styles.card}>
          <View style={styles.row}>
            <Ionicons name={item.icon} size={28} color={Colors.gold} />
            <View style={styles.text}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.whiteDim} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.whiteDim, fontSize: Typography.size.sm, marginBottom: Spacing.lg },
  card: { marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, marginLeft: Spacing.md },
  title: { color: Colors.white, fontWeight: '700', fontSize: Typography.size.md },
  desc: { color: Colors.whiteMuted, fontSize: Typography.size.xs, marginTop: 2 },
});
