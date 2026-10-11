import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { paymentsService } from '@/services/payments';
import { useAuth } from '@/contexts/AuthContext';

const MIN_WITHDRAW = 50;

export default function WithdrawScreen() {
  const { profile, refresh } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const balance = Number(profile?.balance_zmw ?? 0);

  const onWithdraw = async () => {
    const value = parseFloat(amount);
    if (!value || value < MIN_WITHDRAW) {
      Alert.alert('Minimum', `Minimum withdrawal is K${MIN_WITHDRAW}.`);
      return;
    }
    if (value > balance) {
      Alert.alert('Insufficient', 'Not enough balance.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Phone required', 'Enter your mobile money number.');
      return;
    }
    setLoading(true);
    try {
      const result = await paymentsService.initiatePayout({
        amount_zmw: value,
        phone: phone.trim(),
        competition_id: '',
      });
      if (result.success) {
        Alert.alert('Success', 'Withdrawal initiated.');
        await refresh();
      } else {
        Alert.alert('Unavailable', result.error ?? 'Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Withdraw" showBack />
      <Text style={styles.sub}>Available: K{balance.toFixed(2)} · Min K{MIN_WITHDRAW}</Text>
      <Input
        label={`Amount (${AppConfig.currency})`}
        placeholder="50"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Input
        label="Mobile Money Number"
        placeholder="097XXXXXXX"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Button title="Withdraw" onPress={onWithdraw} loading={loading} size="lg" fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    marginBottom: Spacing.xxl,
    lineHeight: 20,
  },
});
