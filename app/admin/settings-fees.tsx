import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, Alert, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { settingsService } from '@/services/settings';

export default function SettingsFees() {
  const [platform, setPlatform] = useState('3');
  const [entry, setEntry] = useState('23');
  const [comp, setComp] = useState('20');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService.getPlatformFees().then((r) => {
      setPlatform(String(r.data.platform_fee_zmw));
      setEntry(String(r.data.default_entry_fee_zmw));
      setComp(String(r.data.competition_fee_zmw));
    });
  }, []);

  const onSave = async () => {
    const p = Number(platform);
    const e = Number(entry);
    const c = Number(comp);
    if ([p, e, c].some((n) => isNaN(n) || n < 0)) {
      Alert.alert('Invalid', 'Enter valid amounts.');
      return;
    }
    setSaving(true);
    const { error } = await settingsService.setPlatformFees({
      platform_fee_zmw: p,
      default_entry_fee_zmw: e,
      competition_fee_zmw: c,
    });
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Saved', 'Platform and entry fees updated.');
  };

  return (
    <Screen scroll>
      <Header title="Fees & Entry" showBack />
      <Card style={styles.card}>
        <Text style={styles.hint}>
          These values drive match confirmation (K23 default = competition fee + platform fee).
        </Text>
        <Text style={styles.label}>Platform fee (ZMW)</Text>
        <TextInput
          style={styles.input}
          value={platform}
          onChangeText={setPlatform}
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.label}>Competition fee (ZMW)</Text>
        <TextInput
          style={styles.input}
          value={comp}
          onChangeText={setComp}
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.label}>Default total entry (ZMW)</Text>
        <TextInput
          style={styles.input}
          value={entry}
          onChangeText={setEntry}
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.textMuted}
        />
        <Button title="Save fees" onPress={onSave} loading={saving} fullWidth />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.md, padding: Spacing.lg },
  hint: { color: Colors.textSecondary, marginBottom: Spacing.lg, fontSize: Typography.size.sm },
  label: { color: Colors.text, marginBottom: Spacing.sm, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
    fontSize: Typography.size.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
