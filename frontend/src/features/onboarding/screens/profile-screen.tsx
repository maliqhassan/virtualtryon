import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { FadeInView } from '@/components/fade-in-view';
import { themeColors } from '@/constants/theme';

import { OnboardingFrame } from '../components/onboarding-frame';
import { StepHeader } from '../components/step-header';
import { FIRST_PIECES_HREF } from '../routes';

// Placeholder values in the shape the analysis will return
// (profile { faceShape, bodyShape, undertone, season, palette[], advice },
// 04-react-native.md §9). Shown as a sample, never as the user's result.
const TILES = [
  ['FACE', 'Oval'],
  ['BODY', 'Rectangle'],
  ['UNDERTONE', 'Golden'],
  ['SEASON', 'Warm autumn'],
] as const;
const PALETTE = [
  ['#F2E8D8', 'ivory'],
  ['#C9A06A', 'camel'],
  ['#4E5B44', 'olive'],
  ['#A8452F', 'rust'],
  ['#2C2A26', 'espresso'],
] as const;

/** The style-profile payoff. Personal analysis isn't built yet, so this is labelled a sample. */
export function ProfileScreen() {
  return (
    <OnboardingFrame
      footer={
        <AppButton label="Build my wardrobe" onPress={() => router.push(FIRST_PIECES_HREF)} />
      }
    >
      <StepHeader step={4} back={false} />
      <Text className="mt-xxl font-mono text-[10px] uppercase tracking-[1.6px] text-primary">
        Style profile · sample
      </Text>
      <Text
        className="mt-[10px] font-display text-[36px] leading-[37px] text-ink-primary"
        accessibilityRole="header"
      >
        Warm neutral,{'\n'}
        <Text className="font-display-italic">rectangle frame.</Text>
      </Text>
      <View className="mt-md flex-row items-center gap-sm rounded-lg border border-callout-border bg-callout-bg px-md py-sm">
        <AppIcon name="info" size="sm" color={themeColors.inkSecondary} />
        <Text className="flex-1 font-sans text-[12px] leading-[17px] text-ink-secondary">
          An example of what Noor will read from your photo. Your own profile arrives in an update.
        </Text>
      </View>

      <View className="mt-[20px] flex-row flex-wrap justify-between gap-y-[9px]">
        {TILES.map(([key, value], index) => (
          <FadeInView key={key} index={index} className="w-[48.8%]">
            <View className="rounded-xl border border-border bg-surface px-[14px] py-[13px]">
              <Text className="font-mono text-[9px] tracking-[1.1px] text-neutral-400">{key}</Text>
              <Text className="mt-[6px] font-display text-[21px] leading-[22px] text-ink-primary">
                {value}
              </Text>
            </View>
          </FadeInView>
        ))}
      </View>

      <Text className="mt-[22px] font-mono text-[10px] uppercase tracking-[1.4px] text-neutral-500">
        Colours that love you
      </Text>
      <View className="mt-[10px] flex-row gap-[6px]">
        {PALETTE.map(([color, name]) => (
          <View key={name} className="flex-1">
            <View
              className="h-[58px] rounded-lg border border-[rgba(22,19,15,0.06)]"
              style={{ backgroundColor: color }}
            />
            <Text className="mt-[6px] font-mono text-[9px] text-neutral-500">{name}</Text>
          </View>
        ))}
      </View>

      <View className="mt-[18px] flex-row gap-md rounded-xxl bg-inverse px-[18px] py-lg">
        <AppIcon name="auto_awesome" size={19} color={themeColors.goldSoft} />
        <View className="flex-1">
          <Text className="font-sans-bold text-[13.5px] text-cream">Define the waist</Text>
          <Text className="mt-xs font-sans text-[12.5px] leading-[19px] text-night-body">
            Belted kurtas, waistcoats and tucked shirts. Skip boxy crops and icy pastels near the
            face.
          </Text>
        </View>
      </View>
    </OnboardingFrame>
  );
}
