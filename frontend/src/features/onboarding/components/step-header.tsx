import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';

export const ONBOARDING_STEPS = 5;

type StepHeaderProps = {
  /** 1-based step; bars up to and including it are filled. */
  step: number;
  dark?: boolean;
  /** Hide the back arrow (screens you can't go back from). */
  back?: boolean;
};

/** Back arrow, five segment bars and an "n / 5" label. */
export function StepHeader({ step, dark = false, back = true }: StepHeaderProps) {
  const on = dark ? themeColors.nightText : themeColors.inkPrimary;
  const off = dark ? 'rgba(255, 255, 255, 0.16)' : '#E2DED6';
  return (
    <View className="flex-row items-center gap-md">
      {back && (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <AppIcon name="arrow_back" size="lg" color={on} />
        </Pressable>
      )}
      <View
        className="flex-1 flex-row gap-[5px]"
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`}
      >
        {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
          <View
            key={i}
            className="h-[3px] flex-1 rounded-full"
            style={{ backgroundColor: i < step ? on : off }}
          />
        ))}
      </View>
      <Text className="font-mono text-[10px] text-neutral-500">
        {step} / {ONBOARDING_STEPS}
      </Text>
    </View>
  );
}
