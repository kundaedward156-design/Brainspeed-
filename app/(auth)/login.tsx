/**
 * Login — Email+password OR Phone OTP (Africa's Talking)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { authService } from '@/services/auth';

type Mode = 'email' | 'phone';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; phone?: string; otp?: string }>({});

  const onEmailLogin = async () => {
    const e: typeof errors = {};
    if (!email.trim() || !email.includes('@')) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const { user, error } = await authService.login({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        Alert.alert('Login failed', error);
        return;
      }
      if (user) router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const onSendOtp = async () => {
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) {
      setErrors({ phone: 'Enter a valid Zambian mobile number' });
      return;
    }
    setLoading(true);
    try {
      const res = await authService.requestPhoneOtp(phone.trim());
      if (!res.success) {
        Alert.alert('SMS failed', res.error || 'Could not send OTP');
        return;
      }
      setOtpSent(true);
      if (res.debug_otp) {
        Alert.alert('Dev OTP', `Code: ${res.debug_otp}`);
      } else {
        Alert.alert('OTP sent', 'Check your SMS for the 6-digit code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 4) {
      setErrors({ otp: 'Enter the code from SMS' });
      return;
    }
    setLoading(true);
    try {
      const { user, error } = await authService.verifyPhoneOtp(phone.trim(), otp.trim(), fullName.trim() || undefined);
      if (error && !user) {
        Alert.alert('Verification failed', error);
        return;
      }
      if (user) router.replace('/(tabs)');
      else if (error) Alert.alert('Almost there', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid contentStyle={styles.content}>
      <View style={styles.logoWrap}>
        <Logo size="md" />
      </View>

      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.message}>Log in with email or phone number.</Text>

      {/* Mode tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'email' && styles.tabActive]}
          onPress={() => setMode('email')}
        >
          <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'phone' && styles.tabActive]}
          onPress={() => setMode('phone')}
        >
          <Text style={[styles.tabText, mode === 'phone' && styles.tabTextActive]}>Phone</Text>
        </TouchableOpacity>
      </View>

      {mode === 'email' ? (
        <>
          <Input
            label="Email"
            placeholder="you@gmail.com"
            keyboardType="email-address"
            autoComplete="email"
            leftIcon="mail-outline"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            isPassword
            leftIcon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />
          <Button title="Log in" onPress={onEmailLogin} loading={loading} size="lg" fullWidth />
        </>
      ) : (
        <>
          {!otpSent ? (
            <>
              <Input
                label="Phone number"
                placeholder="097XXXXXXX"
                keyboardType="phone-pad"
                leftIcon="phone-portrait-outline"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
              />
              <Input
                label="Full name (new users)"
                placeholder="Optional for first login"
                leftIcon="person-outline"
                value={fullName}
                onChangeText={setFullName}
              />
              <Button title="Send OTP" onPress={onSendOtp} loading={loading} size="lg" fullWidth />
            </>
          ) : (
            <>
              <Text style={styles.otpHint}>Code sent to {phone}</Text>
              <Input
                label="OTP code"
                placeholder="6-digit code"
                keyboardType="number-pad"
                leftIcon="key-outline"
                value={otp}
                onChangeText={setOtp}
                error={errors.otp}
              />
              <Button title="Verify & Log in" onPress={onVerifyOtp} loading={loading} size="lg" fullWidth />
              <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }} style={{ marginTop: 12 }}>
                <Text style={styles.resend}>Change number / Resend</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>No account? </Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={styles.link}>Register</Text>
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
  message: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    marginTop: 6,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.gold },
  tabText: { color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#000', fontWeight: '800' },
  otpHint: { color: Colors.textSecondary, marginBottom: Spacing.md, textAlign: 'center' },
  resend: { color: Colors.gold, textAlign: 'center', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xxl },
  footerText: { color: Colors.textSecondary },
  link: { color: Colors.gold, fontWeight: '700' },
});
