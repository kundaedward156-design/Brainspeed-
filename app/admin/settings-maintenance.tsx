import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, Switch, View, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { settingsService } from '@/services/settings';

export default function SettingsMaintenance() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService.getMaintenance().then((r) => {
      setEnabled(Boolean(r.data.enabled));
      setMessage(r.data.message || '');
    });
  }, []);

  const onSave = async () => {
    setSaving(true);
    const { error } = await settingsService.setMaintenance(enabled, message);
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Saved', enabled ? 'Maintenance mode ON.' : 'Maintenance mode OFF.');
  };

  return (
    <Screen scroll contentStyle={{}}>
      <Header title="Maintenance" showBack />
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Enabled</Text>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: Colors.gold }} />
        </View>
        <Text style={styles.label}>Message for players</Text>
        <TextInput
          style={styles.input}
          multiline
          value={message}
          onChangeText={setMessage}
          placeholder="We will be back soon…"
          placeholderTextColor={Colors.textMuted}
        />
        <Button title="Save" onPress={onSave} loading={saving} fullWidth />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  label: { color: Colors.text, fontWeight: '600', marginBottom: Spacing.sm },
  input: {
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
});
