import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { FadeInView } from '@/components/fade-in-view';
import { PressableScale } from '@/components/pressable-scale';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';

import { OnboardingFrame } from '../components/onboarding-frame';
import { StepHeader } from '../components/step-header';
import { GOALS, useOnboardingPreferences } from '../preferences';
import { QUIZ_HREF } from '../routes';

/** Step 1 of 5: what the user wants from the app (multi-select). */
export function GoalScreen() {
  const goals = useOnboardingPreferences((state) => state.goals);
  const toggleGoal = useOnboardingPreferences((state) => state.toggleGoal);

  return (
    <OnboardingFrame
      footer={
        <AppButton
          label="Continue"
          onPress={() => router.push(QUIZ_HREF)}
          disabled={goals.length === 0}
        />
      }
    >
      <StepHeader step={1} />
      <Text className="mt-[28px] font-mono text-[10px] uppercase tracking-[1.6px] text-primary">
        Let’s begin
      </Text>
      <Text
        className="mt-[10px] font-display text-[36px] leading-[37px] text-ink-primary"
        accessibilityRole="header"
      >
        What brings you{'\n'}to <Text className="font-display-italic">AI Stylist?</Text>
      </Text>
      <Text className="mt-sm font-sans text-[13px] leading-[20px] text-ink-secondary">
        Pick all that apply. Noor shapes your home screen around it.
      </Text>

      <View className="mt-[22px] gap-[10px]">
        {GOALS.map((goal, index) => {
          const on = goals.includes(goal.id);
          return (
            <FadeInView key={goal.id} index={index}>
              <PressableScale
                onPress={() => {
                  selectionFeedback();
                  toggleGoal(goal.id);
                }}
                pressedScale={0.98}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={goal.label}
                className="flex-row items-center gap-[14px] rounded-xxl px-lg py-[14px]"
                style={{
                  borderWidth: 1.5,
                  borderStyle: on ? 'solid' : 'dashed',
                  borderColor: on ? themeColors.inkPrimary : 'rgba(22, 19, 15, 0.2)',
                  backgroundColor: on ? themeColors.surface : 'transparent',
                }}
              >
                <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#EFEAE2]">
                  <AppIcon
                    name={goal.icon}
                    size="md"
                    color={on ? themeColors.primary : themeColors.inkSecondary}
                  />
                </View>
                <Text className="flex-1 font-sans-bold text-[14px] leading-[19px] text-ink-primary">
                  {goal.label}
                </Text>
                <AppIcon
                  name={on ? 'check_circle' : 'radio_button_unchecked'}
                  size={21}
                  color={on ? themeColors.inkPrimary : themeColors.neutral300}
                />
              </PressableScale>
            </FadeInView>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}
