import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Switch,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { authService } from '@/services/auth';
import { profilesService } from '@/services/profiles';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [push, setPush] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authService.getCurrentProfile().then(({ profile: p }) => {
      setProfile(p);
      setName(p?.full_name || '');
      setEmail(p?.email || '');
      setPush(p?.push_enabled !== false);
    });
  }, []);

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await profilesService.update(profile.id, { full_name: name.trim() });
    setSaving(false);
    if (error) Alert.alert('Error', error);
    else Alert.alert('Saved', 'Profile updated.');
  };

  const pickAvatar = async () => {
    if (!profile?.id || !supabase) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]?.uri) return;
    setSaving(true);
    try {
      const uri = res.assets[0].uri;
      const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const path = `avatars/${profile.id}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from('banners').upload(path, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true,
      });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from('banners').getPublicUrl(path);
      const { error } = await profilesService.update(profile.id, { avatar_url: data.publicUrl });
      if (error) throw new Error(error);
      Alert.alert('Saved', 'Avatar updated.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const updateEmail = async () => {
    if (!supabase || !email.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your inbox', 'Confirm the new email via the link we sent.');
  };

  const changePassword = async () => {
    if (!supabase) return;
    if (password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      setPassword('');
      setConfirm('');
      Alert.alert('Updated', 'Password changed successfully.');
    }
  };

  const togglePush = async (v: boolean) => {
    setPush(v);
    if (!profile?.id || !supabase) return;
    await supabase.from('profiles').update({ push_enabled: v }).eq('id', profile.id);
  };

  const logout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: Spacing.sm }}>
      <Header title="Settings" showBack />

      <Text style={styles.section}>Profile</Text>
      <Card style={styles.card}>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={Colors.textMuted} />
        <Button title="Save profile" onPress={saveProfile} loading={saving} fullWidth style={{ marginBottom: Spacing.sm }} />
        <Button title="Change avatar" variant="outline" onPress={pickAvatar} fullWidth />
      </Card>

      <Text style={styles.section}>Email</Text>
      <Card style={styles.card}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={Colors.textMuted}
        />
        <Button title="Update email" onPress={updateEmail} loading={saving} fullWidth />
      </Card>

      <Text style={styles.section}>Push notifications</Text>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Enabled</Text>
          <Switch value={push} onValueChange={togglePush} trackColor={{ true: Colors.gold }} />
        </View>
      </Card>

      <Text style={styles.section}>Change password</Text>
      <Card style={styles.card}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={Colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Confirm password"
          placeholderTextColor={Colors.textMuted}
        />
        <Button title="Update password" onPress={changePassword} loading={saving} fullWidth />
      </Card>

      <Text style={styles.section}>Legal</Text>
      <Card style={styles.card}>
        <LinkRow label="Help & Support" onPress={() => Linking.openURL('mailto:support@brainspeed.app')} />
        <LinkRow label="Terms of Service" onPress={() => Linking.openURL('https://brainspeed.app/terms')} />
        <LinkRow label="Privacy Policy" onPress={() => Linking.openURL('https://brainspeed.app/privacy')} />
      </Card>

      <Button title="Log out" variant="danger" onPress={logout} fullWidth style={{ marginVertical: Spacing.xl }} />
    </Screen>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: Spacing.md }}>
      <Text style={{ color: Colors.text, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: Typography.size.md,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: { marginBottom: Spacing.md },
  label: { color: Colors.textSecondary, marginBottom: Spacing.sm, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
