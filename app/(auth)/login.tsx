/**
 * Login — phone (SMS code) or email + password.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { authService } from '@/services/auth';

type Mode = 'phone' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onEmailLogin = async () => {
    const e: Record<string, string> = {};
    if (!email.trim() || !email.includes('@')) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const { user, error } = await authService.login({ email: email.trim().toLowerCase(), password });
      if (error) return Alert.alert('Login failed', error);
      if (user) router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const onSendOtp = async () => {
    setErrors({});
    setLoading(true);
    try {
      const res = await authService.requestPhoneOtp(phone, fullName.trim() || undefined);
      if (res.error) {
        setErrors({ phone: res.error });
        return;
      }
      setOtpSent(true);
      setCooldown(45);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otp.trim().length < 6) {
      setErrors({ otp: 'Enter the 6-digit code from the SMS' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { user, error } = await authService.verifyPhoneOtp(phone, otp);
      if (error) {
        setErrors({ otp: error });
        return;
      }
      if (user) router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid contentStyle={styles.content}>
      <View style={styles.logoWrap}>
        <Logo size="md" />
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.message}>Sign in to play, deposit and withdraw.</Text>

      <View style={styles.tabs}>
        {(['phone', 'email'] as Mode[]).map((m) => (
          <TouchableOpacity key={m} style={[styles.tab, mode === m && styles.tabActive]} onPress={() => setMode(m)}>
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>{m === 'phone' ? 'Phone' : 'Email'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'email' ? (
        <>
          <Input label="Email" placeholder="you@gmail.com" keyboardType="email-address" autoComplete="email" leftIcon="mail-outline" value={email} onChangeText={setEmail} error={errors.email} />
          <Input label="Password" placeholder="Your password" isPassword leftIcon="lock-closed-outline" value={password} onChangeText={setPassword} error={errors.password} />
          <Button title="Log in" onPress={onEmailLogin} loading={loading} size="lg" fullWidth />
        </>
      ) : !otpSent ? (
        <>
          <Input label="Mobile number" placeholder="097 123 4567" keyboardType="phone-pad" leftIcon="call-outline" value={phone} onChangeText={setPhone} error={errors.phone} />
          <Input label="Your name (new players)" placeholder="e.g. Mwape Banda" autoCapitalize="words" leftIcon="person-outline" value={fullName} onChangeText={setFullName} />
          <Button title="Send code" onPress={onSendOtp} loading={loading} size="lg" fullWidth />
          <Text style={styles.note}>We will text you a 6-digit code. Standard SMS rates may apply.</Text>
        </>
      ) : (
        <>
          <Text style={styles.otpHint}>Enter the code we sent to {phone}</Text>
          <Input label="6-digit code" placeholder="••••••" keyboardType="number-pad" maxLength={6} leftIcon="key-outline" value={otp} onChangeText={setOtp} error={errors.otp} />
          <Button title="Verify and continue" onPress={onVerifyOtp} loading={loading} size="lg" fullWidth />
          <View style={styles.resendRow}>
            <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); setErrors({}); }}>
              <Text style={styles.resend}>Change number</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={cooldown > 0} onPress={onSendOtp}>
              <Text style={[styles.resend, cooldown > 0 && { color: Colors.textMuted }]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>New here? </Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={styles.link}>Create an account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xxl },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  title: { color: Colors.text, fontSize: Typography.size.xxl, fontWeight: '800', textAlign: 'center' },
  message: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', marginBottom: Spacing.xl, marginTop: 6 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surfaceMuted, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.xl },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.surface },
  tabText: { color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },
  note: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center', marginTop: Spacing.md },
  otpHint: { color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center' },
  resendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg },
  resend: { color: Colors.primary, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xxl },
  footerText: { color: Colors.textSecondary },
  link: { color: Colors.primary, fontWeight: '700' },
});
