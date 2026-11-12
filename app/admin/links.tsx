/**
 * Where the admin sets the Telegram community link, Privacy Policy, Terms, etc.
 * These appear on the player Home screen and Profile.
 */
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { settingsService } from '@/services/settings';
import type { AppLinks } from '@/types';

const EMPTY: AppLinks = { telegram_url: '', privacy_url: '', terms_url: '', support_email: '', whatsapp_url: '' };

export default function AdminLinks() {
  const [links, setLinks] = useState<AppLinks>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { settingsService.getLinks().then((r) => setLinks(r.data)); }, []);
  const set = (k: keyof AppLinks) => (v: string) => setLinks((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const clean = Object.fromEntries(Object.entries(links).map(([k, v]) => [k, (v || '').trim()])) as unknown as AppLinks;
    for (const k of ['telegram_url', 'privacy_url', 'terms_url', 'whatsapp_url'] as const) {
      if (clean[k] && !/^https?:\/\//i.test(clean[k])) return Alert.alert('Check the link', 'Links must start with https://');
    }
    setSaving(true);
    const { error } = await settingsService.setLinks(clean);
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Saved', 'Players will see the new links the next time they open the app.');
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Links" showBack />
      <Text style={styles.hint}>These show on the player Home screen and Profile. Leave a field empty to show “not set up yet”.</Text>
      <Input label="Telegram community" placeholder="https://t.me/your_group" autoCapitalize="none" keyboardType="url" leftIcon="paper-plane-outline" value={links.telegram_url} onChangeText={set('telegram_url')} />
      <Input label="Privacy Policy" placeholder="https://yourdomain.com/privacy" autoCapitalize="none" keyboardType="url" leftIcon="document-text-outline" value={links.privacy_url} onChangeText={set('privacy_url')} />
      <Input label="Terms of Service" placeholder="https://yourdomain.com/terms" autoCapitalize="none" keyboardType="url" leftIcon="reader-outline" value={links.terms_url} onChangeText={set('terms_url')} />
      <Input label="WhatsApp (optional)" placeholder="https://wa.me/260970000000" autoCapitalize="none" keyboardType="url" leftIcon="logo-whatsapp" value={links.whatsapp_url} onChangeText={set('whatsapp_url')} />
      <Input label="Support email" placeholder="support@yourdomain.com" autoCapitalize="none" keyboardType="email-address" leftIcon="mail-outline" value={links.support_email} onChangeText={set('support_email')} />
      <Button title="Save links" size="lg" fullWidth loading={saving} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20, marginBottom: Spacing.xl },
});
