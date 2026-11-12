import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { adminService } from '@/services/admin';

export default function AdminAnnouncements() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !body.trim()) return Alert.alert('Missing text', 'Add a title and a message.');
    setSending(true);
    const { error } = await adminService.sendAnnouncement(title.trim(), body.trim());
    setSending(false);
    if (error) return Alert.alert('Error', error);
    setTitle(''); setBody('');
    Alert.alert('Sent', 'Every player will see this in their notifications.');
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Announcement" showBack />
      <Text style={styles.hint}>Sent to all players as an in-app notification (and a push notification once the push webhook is set up).</Text>
      <Input label="Title" placeholder="e.g. Weekend bonus matches" value={title} onChangeText={setTitle} />
      <Input label="Message" placeholder="Write your message…" multiline value={body} onChangeText={setBody} />
      <Button title="Send to all players" size="lg" fullWidth loading={sending} onPress={send} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20, marginBottom: Spacing.xl },
});
