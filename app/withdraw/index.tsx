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

export default function WithdrawScreen() {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(profile?.phone?.replace('+260', '0') || '');
  const [loading, setLoading] = useState(false);

  const onWithdraw = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      Alert.alert('Invalid amount', `Enter a valid amount in ${AppConfig.currency}.`);
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Phone required', 'Enter your mobile money number.');
      return;
    }
    const bal = Number(profile?.balance_zmw || 0);
    if (value > bal) {
      Alert.alert('Insufficient balance', `Available: ZMW ${bal}`);
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
        Alert.alert('Success', result.message || 'Withdrawal initiated. You will be notified when it completes.');
      } else {
        Alert.alert('Withdrawal failed', result.error ?? 'Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Withdraw" showBack />
      <Text style={styles.sub}>
        Send funds to your mobile money (MTN / Airtel / Zamtel) via Lipila.
        {'\n'}Available: ZMW {Number(profile?.balance_zmw || 0).toFixed(0)}
      </Text>
      <Input
        label={`Amount (${AppConfig.currency})`}
        placeholder="50"
        keyboardType="decimal-pad"
        leftIcon="cash-outline"
        value={amount}
        onChangeText={setAmount}
      />
      <Input
        label="Mobile Money Number"
        placeholder="097XXXXXXX"
        keyboardType="phone-pad"
        leftIcon="phone-portrait-outline"
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
