import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { BreathingOrb } from '@/components/breathing-orb';
import { NightGlow } from '@/components/gradient-fill';
import { themeColors } from '@/constants/theme';

import { OnboardingFrame } from '../components/onboarding-frame';
import { PROFILE_HREF } from '../routes';

const STEPS = [
  'Face landmarks',
  'Skin tone',
  'Shoulder : waist ratio',
  'Colour season',
  'Silhouette rules',
];
const STEP_MS = 650;

/** Named steps and a breathing orb (never a spinner), then on to the profile. */
export function AnalysingScreen() {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= STEPS.length) {
      // replace: back never returns to this screen.
      const leave = setTimeout(() => router.replace(PROFILE_HREF), 400);
      return () => clearTimeout(leave);
    }
    const tick = setTimeout(() => setDone(done + 1), STEP_MS);
    return () => clearTimeout(tick);
  }, [done]);

  return (
    <OnboardingFrame dark scroll={false} backdrop={<NightGlow center={{ x: 0.5, y: 0.34 }} />}>
      <View className="flex-1 items-center px-md pt-[110px]">
        <BreathingOrb size={110} />
        <Text
          className="mt-[30px] text-center font-display text-[32px] leading-[35px] text-night-text"
          accessibilityRole="header"
        >
          Reading your{'\n'}
          <Text className="font-display-italic text-gold-soft">proportions</Text>
        </Text>
        <View className="mt-[34px] w-full gap-[13px]" accessibilityLiveRegion="polite">
          {STEPS.map((label, index) => {
            const state = index < done ? 'done' : index === done ? 'active' : 'waiting';
            const color =
              state === 'done' ? '#7FC49C' : state === 'active' ? themeColors.nightText : '#4E4841';
            return (
              <View key={label} className="flex-row items-center gap-[11px]">
                <AppIcon
                  name={
                    state === 'done'
                      ? 'check'
                      : state === 'active'
                        ? 'autorenew'
                        : 'radio_button_unchecked'
                  }
                  size={17}
                  color={color}
                />
                <Text className="font-mono text-[12px]" style={{ color }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
        <View className="mt-[32px] h-[3px] w-full rounded-full bg-[rgba(255,255,255,0.12)]">
          <View
            className="h-[3px] rounded-full bg-gold"
            style={{ width: `${Math.round((done / STEPS.length) * 100)}%` }}
          />
        </View>
        <Text className="mt-md font-mono text-[10.5px] text-neutral-500">about 4 seconds</Text>
      </View>
    </OnboardingFrame>
  );
}
