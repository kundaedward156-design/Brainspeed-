import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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

const QUICK = [20, 50, 100, 200];

export default function DepositScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(toLocalZm(profile?.phone));
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startWatching = () => {
    let tries = 0;
    timer.current = setInterval(async () => {
      tries += 1;
      await paymentsService.refreshPending().catch(() => 0);
      await refresh();
      const { data } = await paymentsService.history(5);
      const dep = data.find((d) => d.type === 'deposit');
      if (dep && dep.status === 'completed') {
        if (timer.current) clearInterval(timer.current);
        setWaiting(null);
        Alert.alert('Deposit received', `${formatMoney(dep.amount)} has been added to your wallet.`, [{ text: 'Done', onPress: () => router.back() }]);
      } else if (dep && dep.status === 'failed') {
        if (timer.current) clearInterval(timer.current);
        setWaiting(null);
        Alert.alert('Deposit not completed', 'The payment was declined or cancelled. You have not been charged.');
      } else if (tries > 40) {
        if (timer.current) clearInterval(timer.current);
        setWaiting(null);
        Alert.alert('Still waiting', 'We will update your wallet as soon as the payment is confirmed.', [{ text: 'OK', onPress: () => router.back() }]);
      }
    }, 5000);
  };

  const onDeposit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return Alert.alert('Amount', 'Enter how much you want to deposit.');
    if (!toE164Zm(phone)) return Alert.alert('Mobile number', 'Enter a valid MTN, Airtel or Zamtel number.');
    setLoading(true);
    const res = await paymentsService.deposit(value, phone);
    setLoading(false);
    if (!res.success) return Alert.alert('Deposit failed', res.error || 'Please try again.');
    setWaiting(res.message || 'Approve the prompt on your phone.');
    startWatching();
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Deposit" showBack />
      <Text style={styles.sub}>Add money from MTN, Airtel or Zamtel mobile money. Your wallet is credited as soon as the payment is approved.</Text>

      {waiting ? (
        <View style={styles.waitCard}>
          <Ionicons name="phone-portrait-outline" size={34} color={Colors.primary} />
          <Text style={styles.waitTitle}>Check your phone</Text>
          <Text style={styles.waitText}>{waiting}</Text>
          <Text style={styles.waitHint}>Enter your PIN to approve. This screen updates automatically.</Text>
        </View>
      ) : (
        <>
          <Input label="Amount (ZMW)" placeholder="0.00" keyboardType="decimal-pad" leftIcon="cash-outline" value={amount} onChangeText={setAmount} />
          <View style={styles.chips}>
            {QUICK.map((q) => (
              <TouchableOpacity key={q} style={[styles.chip, Number(amount) === q && styles.chipActive]} onPress={() => setAmount(String(q))}>
                <Text style={[styles.chipText, Number(amount) === q && styles.chipTextActive]}>K{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Mobile money number" placeholder="097 123 4567" keyboardType="phone-pad" leftIcon="call-outline" value={phone} onChangeText={setPhone} />
          <Button title="Deposit" size="lg" fullWidth loading={loading} onPress={onDeposit} />
          <View style={styles.secure}>
            <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
            <Text style={styles.secureText}>Payments are processed securely by Lipila.</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20, marginBottom: Spacing.xl },
  chips: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, marginTop: -Spacing.sm },
  chip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontWeight: '700' },
  chipTextActive: { color: Colors.primary },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.lg },
  secureText: { color: Colors.textMuted, fontSize: Typography.size.xs },
  waitCard: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xxl, borderWidth: 1, borderColor: Colors.border },
  waitTitle: { color: Colors.text, fontSize: Typography.size.xl, fontWeight: '800', marginTop: Spacing.md },
  waitText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  waitHint: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center', marginTop: Spacing.lg },
});
