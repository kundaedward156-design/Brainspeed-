import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { settingsService } from '@/services/settings';

export default function SettingsScoring() {
  const [points, setPoints] = useState('10');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService.getScoring().then((r) =>
      setPoints(String(r.data.points_per_correct ?? 10))
    );
  }, []);

  const onSave = async () => {
    const n = Number(points);
    if (Number.isNaN(n) || n < 0) {
      Alert.alert('Invalid', 'Enter a valid number.');
      return;
    }
    setSaving(true);
    const { error } = await settingsService.setScoring(n);
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Saved', 'Scoring configuration updated.');
  };

  return (
    <Screen scroll contentStyle={{}}>
      <Header title="Scoring" showBack />
      <Card style={styles.card}>
        <Text style={styles.label}>Points per correct answer</Text>
        <TextInput
          style={styles.input}
          value={points}
          onChangeText={setPoints}
          keyboardType="number-pad"
          placeholderTextColor={Colors.textMuted}
        />
        <Button title="Save" onPress={onSave} loading={saving} fullWidth />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.md },
  label: { color: Colors.text, marginBottom: Spacing.sm, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
    fontSize: Typography.size.lg,
  },
});
