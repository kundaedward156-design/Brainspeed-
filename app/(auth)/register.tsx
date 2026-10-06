/**
 * Registration — email (Gmail) + password, light UI
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/ui/Header';
import { Logo } from '@/components/ui/Logo';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { authService } from '@/services/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim() || !email.includes('@')) e.email = 'Enter a valid email (e.g. Gmail)';
    if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { user, error } = await authService.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        Alert.alert('Registration failed', error);
        return;
      }
      if (user) router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid>
      <Header title="Create Account" showBack />
      <View style={styles.logoWrap}>
        <Logo size="sm" lightBg />
      </View>
      <Text style={styles.message}>Join Brainspeed and start competing for rewards.</Text>

      <Input
        label="Full Name"
        placeholder="Your full name"
        leftIcon="person-outline"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        error={errors.fullName}
      />
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
        placeholder="Create a password"
        isPassword
        leftIcon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />
      <Input
        label="Confirm Password"
        placeholder="Confirm your password"
        isPassword
        leftIcon="lock-closed-outline"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
      />

      <Button title="Create Account" onPress={onRegister} loading={loading} size="lg" fullWidth />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text style={styles.link}>Log In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: { marginBottom: Spacing.lg },
  message: {
    color: Colors.textSecondary,
    fontSize: Typography.size.md,
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: { color: Colors.textSecondary, fontSize: Typography.size.md },
  link: { color: Colors.blue, fontSize: Typography.size.md, fontWeight: '700' },
});
