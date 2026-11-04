import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { FadeInView } from '@/components/fade-in-view';
import { PressableScale } from '@/components/pressable-scale';
import { LIGHT_STRIPES, StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';

import { OnboardingFrame } from '../components/onboarding-frame';
import { StepHeader } from '../components/step-header';
import { type StyleFor, useOnboardingPreferences } from '../preferences';
import { HOW_IT_WORKS_HREF } from '../routes';

const STYLES: Record<StyleFor, [string, string][]> = {
  women: [
    ['Eastern formal', '[ photo · embroidered kameez ]'],
    ['Minimal', '[ photo · ivory co-ord ]'],
    ['Bridal & mehndi', '[ photo · gold lehenga ]'],
    ['Smart casual', '[ photo · linen shirt, jeans ]'],
    ['Modest chic', '[ photo · abaya, long coat ]'],
    ['Street', '[ photo · oversized denim ]'],
  ],
  men: [
    ['Sherwani & formal', '[ photo · ivory sherwani ]'],
    ['Minimal', '[ photo · tonal knit ]'],
    ['Kurta & waistcoat', '[ photo · charcoal waistcoat ]'],
    ['Smart casual', '[ photo · oxford, chinos ]'],
    ['Old money', '[ photo · polo, loafers ]'],
    ['Street', '[ photo · cargo, sneakers ]'],
  ],
};

const SEGMENTS: [StyleFor, string][] = [
  ['women', 'Women'],
  ['men', 'Men'],
];

/** Step 2 of 5: a grid of style photos, multi-select, with a Women/Men toggle. */
export function QuizScreen() {
  const { styleFor, styles, setStyleFor, toggleStyle } = useOnboardingPreferences();
  const picked = styles.length;
  const picksLabel =
    picked < 3
      ? `${picked} picked · pick ${3 - picked} more for sharper suggestions`
      : `${picked} picked · nice range`;

  return (
    <OnboardingFrame
      footer={
        <>
          <Text className="mb-[10px] text-center font-mono text-[10px] text-ink-secondary">
            {picksLabel}
          </Text>
          <AppButton label="Continue" onPress={() => router.push(HOW_IT_WORKS_HREF)} />
        </>
      }
    >
      <StepHeader step={2} />
      <Text
        className="mt-xxl text-center font-display text-[34px] leading-[35px] text-ink-primary"
        accessibilityRole="header"
      >
        Which styles{'\n'}
        <Text className="font-display-italic">speak to you?</Text>
      </Text>

      <View
        className="mt-[18px] w-[220px] flex-row gap-xs self-center rounded-full bg-[#ECE8E1] p-xs"
        accessibilityRole="tablist"
      >
        {SEGMENTS.map(([value, label]) => {
          const on = styleFor === value;
          return (
            <Pressable
              key={value}
              onPress={() => {
                selectionFeedback();
                setStyleFor(value);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className={`flex-1 items-center rounded-full py-[10px] ${on ? 'bg-surface' : ''}`}
              style={on ? { boxShadow: '0px 2px 8px rgba(22, 19, 15, 0.08)' } : undefined}
            >
              <Text
                className={`font-sans-bold text-[13px] ${on ? 'text-ink-primary' : 'text-ink-secondary'}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-[18px] flex-row flex-wrap justify-between gap-y-md">
        {STYLES[styleFor].map(([label, caption], index) => {
          const id = `${styleFor}:${label}`;
          const on = styles.includes(id);
          return (
            <FadeInView key={id} index={index} className="w-[48.5%]">
              <PressableScale
                onPress={() => {
                  selectionFeedback();
                  toggleStyle(id);
                }}
                pressedScale={0.97}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
              >
                <View
                  className="rounded-[24px] p-xs"
                  style={{
                    borderWidth: on ? 2 : 1.5,
                    borderStyle: on ? 'solid' : 'dashed',
                    borderColor: on ? themeColors.inkPrimary : 'rgba(22, 19, 15, 0.2)',
                  }}
                >
                  <View className="aspect-[3/4] justify-end overflow-hidden rounded-[19px] p-[11px]">
                    <StripeFill tone={LIGHT_STRIPES[index % 4]} />
                    <Text className="font-mono text-[8.5px] text-[rgba(22,19,15,0.42)]">
                      {caption}
                    </Text>
                    {on && (
                      <View className="absolute right-[9px] top-[9px] h-[26px] w-[26px] items-center justify-center rounded-full bg-inverse">
                        <AppIcon name="check" size={16} color={themeColors.background} />
                      </View>
                    )}
                  </View>
                </View>
                <Text className="mt-sm text-center font-sans-bold text-[13px] text-ink-primary">
                  {label}
                </Text>
              </PressableScale>
            </FadeInView>
          );
        })}
      </View>
    </OnboardingFrame>
  );
}
