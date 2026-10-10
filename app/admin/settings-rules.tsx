import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { settingsService } from '@/services/settings';

export default function SettingsRules() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService.getCompetitionRules().then((r) => setText(r.data.text || ''));
  }, []);

  const onSave = async () => {
    setSaving(true);
    const { error } = await settingsService.setCompetitionRules(text);
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Saved', 'Competition rules updated.');
  };

  return (
    <Screen scroll contentStyle={{}}>
      <Header title="Competition rules" showBack />
      <Card style={styles.card}>
        <TextInput
          style={styles.input}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Rules text…"
          placeholderTextColor={Colors.textMuted}
        />
        <Button title="Save" onPress={onSave} loading={saving} fullWidth />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.md },
  input: {
    minHeight: 180,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
});
