import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Switch, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { bannersService } from '@/services/banners';
import { rewardsService } from '@/services/rewards';

export default function AdminMore() {
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardImage, setRewardImage] = useState<string | null>(null);
  const [bannerActive, setBannerActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const pickImage = async (target: 'banner' | 'reward') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (target === 'banner') setBannerImage(result.assets[0].uri);
    else setRewardImage(result.assets[0].uri);
  };

  const saveBanner = async () => {
    if (!bannerTitle.trim()) {
      Alert.alert('Title required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await bannersService.create({
        title: bannerTitle.trim(),
        description: bannerDesc.trim() || null,
        is_active: bannerActive,
        priority: 0,
        imageUri: bannerImage,
      });
      if (error) {
        Alert.alert('Could not save banner', error);
        return;
      }
      Alert.alert('Banner saved', 'It will rotate on Home when active.');
      setBannerTitle('');
      setBannerDesc('');
      setBannerImage(null);
    } finally {
      setSaving(false);
    }
  };

  const saveReward = async () => {
    const amount = parseFloat(rewardAmount);
    if (!rewardTitle.trim() || !amount) {
      Alert.alert('Title and amount required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await rewardsService.create({
        title: rewardTitle.trim(),
        amount_zmw: amount,
        is_active: true,
        imageUri: rewardImage,
      });
      if (error) {
        Alert.alert('Could not save reward', error);
        return;
      }
      Alert.alert('Reward saved', 'It will rotate on the Rewards screen.');
      setRewardTitle('');
      setRewardAmount('');
      setRewardImage(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Header title="More" />
      <Text style={styles.section}>Banners</Text>
      <Card style={styles.card}>
        <Text style={styles.hint}>Active banners auto-swap on Home.</Text>
        <Field label="Title" value={bannerTitle} onChangeText={setBannerTitle} />
        <Field label="Description" value={bannerDesc} onChangeText={setBannerDesc} />
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Active</Text>
          <Switch
            value={bannerActive}
            onValueChange={setBannerActive}
            trackColor={{ true: Colors.gold, false: Colors.border }}
          />
        </View>
        {bannerImage ? (
          <Image source={{ uri: bannerImage }} style={styles.preview} />
        ) : null}
        <Button
          title={bannerImage ? 'Change image' : 'Upload image'}
          variant="outline"
          size="sm"
          onPress={() => pickImage('banner')}
          style={{ marginBottom: Spacing.md }}
        />
        <Button title="Save banner" onPress={saveBanner} loading={saving} fullWidth />
      </Card>

      <Text style={styles.section}>Rewards</Text>
      <Card style={styles.card}>
        <Text style={styles.hint}>Published rewards rotate on Rewards.</Text>
        <Field label="Title" value={rewardTitle} onChangeText={setRewardTitle} />
        <Field
          label="Amount (ZMW)"
          value={rewardAmount}
          onChangeText={setRewardAmount}
          keyboardType="decimal-pad"
        />
        {rewardImage ? (
          <Image source={{ uri: rewardImage }} style={styles.preview} />
        ) : null}
        <Button
          title={rewardImage ? 'Change image' : 'Upload image'}
          variant="outline"
          size="sm"
          onPress={() => pickImage('reward')}
          style={{ marginBottom: Spacing.md }}
        />
        <Button title="Save reward" onPress={saveReward} loading={saving} fullWidth />
      </Card>

      <Text style={styles.section}>App settings</Text>
      <Card style={styles.card}>
        <Row icon="cog-outline" title="Competition rules" />
        <Row icon="stats-chart-outline" title="Scoring configuration" />
        <Row icon="construct-outline" title="Maintenance mode" />
      </Card>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Row({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={Colors.goldDark} />
      <Text style={styles.rowTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    color: Colors.text,
    fontSize: Typography.size.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  card: { marginBottom: Spacing.lg },
  hint: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: Typography.size.md,
    backgroundColor: Colors.surface,
    minHeight: 48,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  preview: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowTitle: { marginLeft: Spacing.md, color: Colors.text, fontWeight: '600' },
});
