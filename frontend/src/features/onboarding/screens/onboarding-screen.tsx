import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { FadeInView } from '@/components/fade-in-view';
import { AccountIcon, ShopIcon, TryOnIcon } from '@/components/tab-icons';

import { markOnboardingSeen } from '../onboarding-flag';

const STEPS = [
  {
    icon: AccountIcon,
    title: 'Add your photo once',
    body: 'Take or choose one full-body photo. We use it for every try-on, so you only do it once.',
  },
  {
    icon: ShopIcon,
    title: 'Your clothes, or a store’s',
    body: 'Photograph clothes you own, or browse stores and pick something you’re thinking of buying.',
  },
  {
    icon: TryOnIcon,
    title: 'Try it on in one tap',
    body: 'Pick a piece and tap “Try it on”. Your first try-on is free.',
  },
];

export function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 justify-between px-xl py-xxl">
        <View className="items-end">
          {!isLast && (
            <Pressable onPress={finish} accessibilityRole="button" hitSlop={12} className="p-sm">
              <Text className="text-sm font-semibold text-ink-secondary">Skip</Text>
            </Pressable>
          )}
        </View>

        {/* Keyed by step so each new card animates in. */}
        <FadeInView key={step.title}>
          <View className="mb-xl h-20 w-20 items-center justify-center rounded-full bg-inverse">
            <step.icon color="#C9A227" size={34} />
          </View>
          <Text className="text-sm font-semibold text-primary">
            {index + 1} of {STEPS.length}
          </Text>
          <Text className="mt-sm font-display text-[44px] leading-[46px] text-ink-primary">
            {step.title}
          </Text>
          <Text className="mt-md text-base text-ink-secondary">{step.body}</Text>
          {isLast && (
            <Text className="mt-xl text-sm text-ink-secondary">
              Your photo is only used to create your try-ons, and you can delete it at any time in
              Account.
            </Text>
          )}
        </FadeInView>

        <View className="gap-lg">
          <View className="flex-row justify-center gap-sm">
            {STEPS.map((s, i) => (
              <View
                key={s.title}
                className={
                  i === index
                    ? 'h-2 w-6 rounded-full bg-primary'
                    : 'h-2 w-2 rounded-full bg-neutral-300'
                }
              />
            ))}
          </View>
          <AppButton
            label={isLast ? 'Get started' : 'Next'}
            onPress={isLast ? finish : () => setIndex(index + 1)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
