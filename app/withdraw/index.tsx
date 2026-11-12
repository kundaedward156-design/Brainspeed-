import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { paymentsService } from '@/services/payments';
import { useAuth } from '@/contexts/AuthContext';
import { toE164Zm, toLocalZm } from '@/utils/phone';

export default function WithdrawScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(toLocalZm(profile?.phone));
  const [loading, setLoading] = useState(false);
  const balance = Number(profile?.balance_zmw ?? 0);

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return Alert.alert('Amount', 'Enter how much you want to withdraw.');
    if (value > balance) return Alert.alert('Insufficient balance', `You can withdraw up to ${formatMoney(balance)}.`);
    if (!toE164Zm(phone)) return Alert.alert('Mobile number', 'Enter a valid MTN, Airtel or Zamtel number.');
    setLoading(true);
    const res = await paymentsService.withdraw(value, phone);
    setLoading(false);
    await refresh();
    if (!res.success) return Alert.alert('Withdrawal failed', res.error || 'Please try again.');
    Alert.alert('Withdrawal submitted', res.message || 'The money is on its way to your mobile money account.', [
      { text: 'View wallet', onPress: () => router.replace('/(tabs)/wallet') },
    ]);
  };

  const confirm = () => {
    const value = Number(amount);
    if (!value || value <= 0) return submit();
    Alert.alert('Confirm withdrawal', `Send ${formatMoney(value)} to ${phone || 'this number'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', onPress: submit },
    ]);
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Withdraw" showBack />
      <View style={styles.balance}>
        <Text style={styles.balLabel}>Available to withdraw</Text>
        <Text style={styles.balValue}>{formatMoney(balance)}</Text>
      </View>

      <Input label="Amount (ZMW)" placeholder="0.00" keyboardType="decimal-pad" leftIcon="cash-outline" value={amount} onChangeText={setAmount} />
      <Input label="Send to (mobile money number)" placeholder="097 123 4567" keyboardType="phone-pad" leftIcon="call-outline" value={phone} onChangeText={setPhone} />
      <Button title="Withdraw" size="lg" fullWidth loading={loading} onPress={confirm} />

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
        <Text style={styles.noteText}>
          Withdrawals are sent to MTN, Airtel or Zamtel mobile money. If a payout fails, the money returns to your wallet automatically.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { backgroundColor: Colors.primarySoft, borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.xl },
  balLabel: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: '600' },
  balValue: { color: Colors.primaryDeep, fontSize: 32, fontWeight: '800', marginTop: 4 },
  note: { flexDirection: 'row', gap: 8, marginTop: Spacing.xl },
  noteText: { flex: 1, color: Colors.textMuted, fontSize: Typography.size.xs, lineHeight: 17 },
});
