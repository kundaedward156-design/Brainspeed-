/**
 * Login — light UI matching product screenshot
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { authService } from '@/services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim() || !email.includes('@')) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onLogin = async () => {
    if (!validate()) return;
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

  return (
    <Screen scroll keyboardAvoid contentStyle={styles.content}>
      <View style={styles.decorTop}>
        <LinearGradient
          colors={['rgba(30,111,255,0.12)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.logoWrap}>
        <Logo size="md" lightBg />
      </View>

      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.message}>Log in to continue competing on Brainspeed.</Text>

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

      <Button title="Log In" onPress={onLogin} loading={loading} size="lg" fullWidth />

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={styles.link}>Create Account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: Spacing.xxl },
  decorTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 160,
    height: 120,
  },
  logoWrap: { marginBottom: Spacing.xxxl, marginTop: Spacing.lg },
  title: {
    color: Colors.text,
    fontSize: Typography.size.xxxl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: Typography.size.md,
    marginBottom: Spacing.xxxl,
    lineHeight: 22,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xxl,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: {
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
    fontSize: Typography.size.sm,
  },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: Typography.size.md },
  link: { color: Colors.blue, fontSize: Typography.size.md, fontWeight: '700' },
});
