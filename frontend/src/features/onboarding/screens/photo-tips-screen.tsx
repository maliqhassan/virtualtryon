import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FadeInView } from '@/components/fade-in-view';
import { FilledBadge } from '@/components/filled-badge';
import { PhotoFill } from '@/components/photo-fill';
import type { StockPhoto } from '@/constants/stock-photos';

import { OnboardingFrame } from '../components/onboarding-frame';
import { StepHeader } from '../components/step-header';
import { ONBOARDING_PHOTO_HREF } from '../routes';

// A real example for each: three to copy, three to avoid.
const TIPS: [boolean, string, StockPhoto][] = [
  [true, 'Solo, front-facing, full or half body', 'tipSoloFront'],
  [false, 'Group photos or people in the background', 'tipGroup'],
  [true, 'Fitted clothes, plain wall, daylight', 'tipPlainWall'],
  [false, 'Back turned, or face covered', 'tipBack'],
  [true, 'Arms relaxed, a little away from the body', 'tipArmsRelaxed'],
  [false, 'Mirror selfies with flash', 'tipMirror'],
];

/** Step 4 of 5: dos and don’ts before the camera opens. */
export function PhotoTipsScreen() {
  return (
    <OnboardingFrame
      footer={
        <AppButton
          label="Got it, take my photo"
          onPress={() => router.push(ONBOARDING_PHOTO_HREF)}
        />
      }
    >
      <StepHeader step={4} />
      <Text
        className="mt-[22px] font-display text-[32px] leading-[34px] text-ink-primary"
        accessibilityRole="header"
      >
        A good photo,{'\n'}
        <Text className="font-display-italic">a truer try-on.</Text>
      </Text>
      <Text className="mt-sm font-sans text-[13px] leading-[20px] text-ink-secondary">
        Thirty seconds of setup makes every result look like you.
      </Text>

      <View className="mt-[18px] flex-row flex-wrap justify-between gap-y-[14px]">
        {TIPS.map(([good, label, photo], index) => (
          <FadeInView key={label} index={index} className="w-[48.5%]">
            <View className="aspect-[3/4] justify-end overflow-hidden rounded-[20px] bg-muted p-[10px]">
              <PhotoFill photo={photo} />
              <View className="absolute right-[9px] top-[9px]">
                <FilledBadge kind={good ? 'do' : 'dont'} />
              </View>
            </View>
            <Text
              className="mt-sm font-sans-semibold text-[12.5px] leading-[17px] text-ink-primary"
              accessibilityLabel={`${good ? 'Do' : 'Don’t'}: ${label}`}
            >
              {label}
            </Text>
          </FadeInView>
        ))}
      </View>
    </OnboardingFrame>
  );
}
