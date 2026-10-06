import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { AppConfig } from '@/constants/config';
import { paymentsService } from '@/services/payments';

export default function DepositScreen() {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const onDeposit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      Alert.alert('Invalid amount', `Enter a valid amount in ${AppConfig.currency}.`);
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Phone required', 'Enter your mobile money number.');
      return;
    }
    setLoading(true);
    try {
      const result = await paymentsService.initiateDeposit({
        amount_zmw: value,
        phone: phone.trim(),
      });
      if (result.success) {
        Alert.alert('Success', 'Deposit initiated. You will be notified when it completes.');
      } else {
        Alert.alert('Deposit unavailable', result.error ?? 'Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Deposit" showBack />
      <Text style={styles.sub}>Add funds to your wallet using mobile money.</Text>
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
      <Button title="Continue" onPress={onDeposit} loading={loading} size="lg" fullWidth />
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
