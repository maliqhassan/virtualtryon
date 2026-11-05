import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { PressableScale } from '@/components/pressable-scale';
import { StripeFill, type StripeTone } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { GOAL_HREF, markOnboardingSeen, OnboardingFrame } from '@/features/onboarding';

import { GoogleMark } from '../components/google-mark';
import { useContinueWithGoogle } from '../hooks/use-account';
import { signInErrorMessage } from '../services/auth-api';

const COLLAGE: { tone: StripeTone; style: object; caption?: string }[] = [
  { tone: 'warm', style: { left: 4, top: 36, height: 200, transform: [{ rotate: '-7deg' }] } },
  { tone: 'lilac', style: { right: 4, top: 46, height: 196, transform: [{ rotate: '7deg' }] } },
  {
    tone: 'blush',
    style: { alignSelf: 'center', top: 20, height: 210, zIndex: 2 },
    caption: '[ look · ivory kurta ]',
  },
];

function ProviderButton({
  label,
  mark,
  dark = false,
  busy = false,
  onPress,
}: {
  label: string;
  mark: ReactNode;
  dark?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={busy}
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      className={`min-h-[52px] flex-row items-center justify-center gap-[9px] rounded-xl ${
        dark ? 'bg-inverse' : 'border border-[rgba(22,19,15,0.12)] bg-surface'
      }`}
    >
      {busy ? <ActivityIndicator size="small" color={themeColors.inkPrimary} /> : mark}
      <Text
        className={`font-sans-bold text-[14.5px] ${dark ? 'text-ink-onPrimary' : 'text-ink-primary'}`}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/** "Make it yours": Google sign-in (ADR 0012), or try as a guest. */
export function SignInScreen() {
  const signIn = useContinueWithGoogle();

  const handleGoogle = () =>
    signIn.mutate(undefined, {
      onSuccess: async (result) => {
        if (!result) return; // the picker was closed
        if (result.created) {
          router.push(GOAL_HREF);
        } else {
          // A returning account has been through onboarding already.
          await markOnboardingSeen();
          router.replace('/');
        }
      },
    });

  const errorMessage = signInErrorMessage(signIn.error);

  return (
    <OnboardingFrame>
      <View
        className="h-[290px]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {COLLAGE.map(({ tone, style, caption }) => (
          <View
            key={tone}
            className="absolute w-[150px] justify-end overflow-hidden rounded-[22px] p-md"
            style={[style, { boxShadow: '0px 14px 30px rgba(22, 19, 15, 0.12)' }]}
          >
            <StripeFill tone={tone} />
            {caption && (
              <Text className="font-mono text-[8.5px] text-[rgba(22,19,15,0.4)]">{caption}</Text>
            )}
          </View>
        ))}
        <View
          className="absolute right-[40px] top-[222px] z-10 flex-row items-center gap-[6px] rounded-full bg-inverse px-md py-sm"
          style={{ boxShadow: '0px 8px 20px rgba(22, 19, 15, 0.25)' }}
        >
          <AppIcon name="auto_awesome" size={14} color={themeColors.goldSoft} />
          <Text className="font-mono-semibold text-[11px] text-cream">96 fit</Text>
        </View>
      </View>

      <Text
        className="font-display text-[38px] leading-[40px] text-ink-primary"
        accessibilityRole="header"
      >
        Make it <Text className="font-display-italic">yours.</Text>
      </Text>
      <Text className="mt-[10px] font-sans text-[14px] leading-[22px] text-ink-secondary">
        Save your closet, your style profile and every look across devices.
      </Text>

      <View className="mt-xxl gap-[10px]">
        <ProviderButton
          label={signIn.isPending ? 'Signing in…' : 'Continue with Google'}
          busy={signIn.isPending}
          mark={<GoogleMark />}
          onPress={handleGoogle}
        />
      </View>
      {errorMessage && (
        <Text
          className="mt-[10px] text-center font-sans text-[12.5px] text-error"
          accessibilityRole="alert"
        >
          {errorMessage}
        </Text>
      )}
      <Pressable
        onPress={() => router.push(GOAL_HREF)}
        accessibilityRole="button"
        hitSlop={8}
        className="mt-[18px] items-center"
      >
        <Text className="font-sans-bold text-[13px] text-primary">Try it first as a guest</Text>
      </Pressable>
      <Text className="mt-xxl text-center font-sans text-[11px] leading-[17px] text-neutral-500">
        Your photos are processed privately and can be deleted any time.
      </Text>
    </OnboardingFrame>
  );
}
