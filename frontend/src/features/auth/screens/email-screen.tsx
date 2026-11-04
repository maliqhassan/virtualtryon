import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';
import { GOAL_HREF, OnboardingFrame, markOnboardingSeen } from '@/features/onboarding';

import { useContinueWithEmail } from '../hooks/use-account';
import { EmailAuthError } from '../services/auth-api';

// Matches the server's rules (backend/app/schemas/auth.py).
const schema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Check the email format'),
  password: z.string().min(8, 'Use 8 or more characters').max(128, 'Use 128 characters or fewer'),
});
type FormValues = z.infer<typeof schema>;

const STRENGTH_LABELS = ['too short', 'weak', 'fair', 'good', 'strong'] as const;

/** 0–4: length first, then variety (mixed case, digits, symbols or 12+ characters). */
function passwordStrength(password: string): number {
  if (password.length < 8) return 0;
  return (
    1 +
    Number(/[a-z]/.test(password) && /[A-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password) || password.length >= 12)
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[10px] uppercase tracking-[1.4px] text-neutral-500">
      {children}
    </Text>
  );
}

/**
 * Direct email sign-in (ADR 0010): no code, no link. A new email creates
 * the account and onboarding continues; a known email signs straight in.
 */
export function EmailScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const signIn = useContinueWithEmail();
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const email = useWatch({ control, name: 'email' });
  const password = useWatch({ control, name: 'password' });
  const emailLooksValid = schema.shape.email.safeParse(email).success;
  const strength = passwordStrength(password);
  const strengthColor = strength >= 3 ? themeColors.success : strength >= 1 ? '#C9922E' : '#B4402E';

  const onSubmit = handleSubmit((values) =>
    signIn.mutate(values, {
      onSuccess: async ({ created }) => {
        if (created) {
          router.push(GOAL_HREF);
        } else {
          // A returning account has been through onboarding already.
          await markOnboardingSeen();
          router.replace('/');
        }
      },
    }),
  );

  const serverError = signIn.error instanceof EmailAuthError ? signIn.error.message : null;
  const fieldBorder = (field: 'email' | 'password', hasError: boolean) =>
    hasError
      ? 'border-[1.5px] border-error'
      : focused === field
        ? 'border-[1.5px] border-inverse'
        : 'border border-[rgba(22,19,15,0.12)]';

  return (
    <OnboardingFrame
      footer={
        <Text className="text-center font-sans text-[11px] leading-[17px] text-neutral-500">
          No codes, no links. You’re in the moment you tap Continue.{'\n'}By continuing you agree to
          the Terms and Privacy Policy.
        </Text>
      }
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        className="self-start"
      >
        <AppIcon name="arrow_back" size="lg" />
      </Pressable>
      <Text
        className="mt-lg font-display text-[34px] leading-[36px] text-ink-primary"
        accessibilityRole="header"
      >
        Continue with <Text className="font-display-italic">email.</Text>
      </Text>
      <Text className="mt-[9px] font-sans text-[13.5px] leading-[21px] text-ink-secondary">
        New here? We’ll create your account. Already have one? You’ll go straight in.
      </Text>

      <View className="mt-[26px] gap-sm">
        <FieldLabel>Email</FieldLabel>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <>
              <View
                className={`flex-row items-center gap-[10px] rounded-xl bg-surface px-lg ${fieldBorder('email', !!fieldState.error)}`}
              >
                <AppIcon name="mail" size={19} color={themeColors.inkSecondary} />
                <TextInput
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    if (signIn.isError) signIn.reset();
                  }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => {
                    setFocused(null);
                    onBlur();
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={themeColors.neutral400}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  accessibilityLabel="Email"
                  className="flex-1 py-[15px] font-sans text-[14.5px] text-ink-primary"
                />
                {emailLooksValid && (
                  <AppIcon name="check_circle" size="sm" color={themeColors.success} />
                )}
              </View>
              {fieldState.error && (
                <Text className="font-sans text-[12px] text-error" accessibilityRole="alert">
                  {fieldState.error.message}
                </Text>
              )}
            </>
          )}
        />
      </View>

      <View className="mt-lg gap-sm">
        <FieldLabel>Password</FieldLabel>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <>
              <View
                className={`flex-row items-center gap-[10px] rounded-xl bg-surface px-lg ${fieldBorder('password', !!fieldState.error)}`}
              >
                <AppIcon name="lock" size={19} color={themeColors.inkSecondary} />
                <TextInput
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    if (signIn.isError) signIn.reset();
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => {
                    setFocused(null);
                    onBlur();
                  }}
                  secureTextEntry={!showPassword}
                  placeholder="8 or more characters"
                  placeholderTextColor={themeColors.neutral400}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  accessibilityLabel="Password"
                  className="flex-1 py-[15px] font-sans text-[14.5px] text-ink-primary"
                />
                <Pressable
                  onPress={() => setShowPassword((shown) => !shown)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  hitSlop={10}
                >
                  <AppIcon
                    name={showPassword ? 'visibility_off' : 'visibility'}
                    size={19}
                    color={themeColors.neutral500}
                  />
                </Pressable>
              </View>
              <View className="mt-xxs flex-row gap-[5px]">
                {[1, 2, 3, 4].map((segment) => (
                  <View
                    key={segment}
                    className="h-[3px] flex-1 rounded-full"
                    style={{ backgroundColor: segment <= strength ? strengthColor : '#E2DED6' }}
                  />
                ))}
              </View>
              <View className="flex-row items-center justify-between">
                <Text
                  className="font-mono text-[10.5px]"
                  style={{ color: password ? strengthColor : themeColors.neutral500 }}
                >
                  {fieldState.error?.message ?? `${STRENGTH_LABELS[strength]} · 8+ characters`}
                </Text>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'Password reset is coming soon',
                      'For now, use the password you signed up with.',
                    )
                  }
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text className="font-sans-bold text-[12px] text-primary">Forgot password?</Text>
                </Pressable>
              </View>
            </>
          )}
        />
      </View>

      {serverError && (
        <Text className="mt-lg font-sans text-[13px] text-error" accessibilityRole="alert">
          {serverError}
        </Text>
      )}
      <View className="mt-xxl">
        <AppButton
          label={signIn.isPending ? 'Signing in…' : 'Continue'}
          onPress={onSubmit}
          disabled={signIn.isPending || (formState.isSubmitted && !formState.isValid)}
        />
      </View>
    </OnboardingFrame>
  );
}
