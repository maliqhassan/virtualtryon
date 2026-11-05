import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { GradientFill } from '@/components/gradient-fill';
import { IconButton } from '@/components/icon-button';
import { ScreenStatusBar } from '@/components/screen-status-bar';
import { StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';

import { describeUsage } from '../components/usage-pill';
import { useUsageQuery } from '../hooks/use-usage-query';
import { PLAN_OFFERS, type PlanId } from '../types';

const BENEFITS = [
  'Daily try-ons instead of a single one',
  'Mix pieces from any store on your photo',
  'Everything saved to your Looks',
];

function GlassChip({ label, style }: { label: string; style: object }) {
  return (
    <View
      className="absolute rounded-full border border-[rgba(246,241,232,0.22)] bg-[rgba(246,241,232,0.16)] px-md py-[7px]"
      style={style}
    >
      <Text className="font-sans-semibold text-[11.5px] text-cream">{label}</Text>
    </View>
  );
}

/**
 * Plans on the dark stage: a before/after hero, the benefits, and Pro /
 * Pro Plus as radio cards. Buying isn't possible yet (in-app purchase is
 * a later feature), so the main button says so instead of pretending.
 * "Continue with Free" is always visible.
 */
export function UpgradeScreen() {
  const usage = useUsageQuery().data;
  // At the end of onboarding nothing is behind this screen: leave to Today.
  const fromOnboarding = useLocalSearchParams<{ from?: string }>().from === 'onboarding';
  const close = () => (fromOnboarding ? router.replace('/') : router.back());
  const paid = PLAN_OFFERS.filter((offer) => offer.id !== 'free');
  const [selected, setSelected] = useState<PlanId>('pro_plus');
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-night">
      <ScreenStatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        // Clear Android's navigation bar, which the page draws under.
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View className="h-[330px] overflow-hidden" accessibilityElementsHidden>
          <StripeFill tone="dark" period={10} />
          <View
            className="absolute left-[22px] top-[70px] h-[220px] w-[42%] justify-end overflow-hidden rounded-[24px] p-md"
            style={{ transform: [{ rotate: '-4deg' }] }}
          >
            <StripeFill tone="dark" period={8} />
            <Text className="font-mono text-[8.5px] text-neutral-500">before · your photo</Text>
          </View>
          <View
            className="absolute right-[18px] top-[54px] h-[246px] w-[46%] justify-end overflow-hidden rounded-[24px] bg-[#4C371F] p-md"
            style={{ transform: [{ rotate: '3deg' }] }}
          >
            <Text className="font-mono text-[8.5px] text-[#C9B896]">after · your try-on</Text>
          </View>
          <GlassChip label="#Office" style={{ left: 12, top: 210 }} />
          <GlassChip label="#Mehndi night" style={{ right: 14, top: 240 }} />
          <GradientFill
            kind="linear"
            stops={[
              { offset: 0.55, color: '#12110F', opacity: 0 },
              { offset: 1, color: '#12110F' },
            ]}
          />
        </View>

        <SafeAreaView edges={['top']} className="absolute right-[18px] top-0">
          <View className="mt-md">
            <IconButton icon="close" tone="glass" accessibilityLabel="Close" onPress={close} />
          </View>
        </SafeAreaView>

        <View className="-mt-[18px] px-[22px]">
          <Text
            className="font-display text-[38px] leading-[39px] text-cream"
            accessibilityRole="header"
          >
            Go Pro,{'\n'}
            <Text className="font-display-italic text-gold-soft">style without limits.</Text>
          </Text>
          {usage && (
            <Text className="mt-sm font-mono text-[10.5px] text-neutral-500">
              now: {describeUsage(usage).toLowerCase()}
            </Text>
          )}

          <View className="mt-[18px] gap-[11px]">
            {BENEFITS.map((benefit) => (
              <View key={benefit} className="flex-row items-center gap-md">
                <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[rgba(201,162,39,0.16)]">
                  <AppIcon name="auto_awesome" size={16} color={themeColors.goldSoft} />
                </View>
                <Text className="flex-1 font-sans text-[14px] text-[#D8D1C5]">{benefit}</Text>
              </View>
            ))}
          </View>

          <View className="mt-[26px] flex-row gap-[10px]" accessibilityRole="radiogroup">
            {paid.map((offer) => {
              const on = selected === offer.id;
              const current = usage?.plan === offer.id;
              return (
                <Pressable
                  key={offer.id}
                  onPress={() => {
                    selectionFeedback();
                    setSelected(offer.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  className="flex-1 rounded-xxl p-[14px]"
                  style={{
                    borderWidth: on ? 1.5 : 1,
                    borderColor: on ? themeColors.goldSoft : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: on ? 'rgba(201, 162, 39, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  {offer.highlight && (
                    <View className="absolute -top-[11px] right-[10px] overflow-hidden rounded-full px-[10px] py-xs">
                      <GradientFill
                        kind="linear"
                        horizontal
                        stops={[
                          { offset: 0, color: '#D9B26A' },
                          { offset: 1, color: '#B4713F' },
                        ]}
                      />
                      <Text className="font-sans-bold text-[10.5px] text-[#1A1509]">
                        Best value
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans-bold text-[13.5px] text-night-text">
                      {offer.name}
                    </Text>
                    <AppIcon
                      name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                      size="sm"
                      color={on ? themeColors.goldSoft : themeColors.inkSecondary}
                    />
                  </View>
                  <Text className="mt-[3px] min-h-[30px] font-sans text-[11px] leading-[15px] text-neutral-400">
                    {offer.allowance}
                    {current ? ' · your plan' : ''}
                  </Text>
                  <Text className="mt-sm font-display text-[22px] text-cream">{offer.price}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-lg text-center font-sans text-[11.5px] text-neutral-500">
            Subscriptions open soon. Failed try-ons never count against your allowance.
          </Text>
          <View className="mt-md">
            <AppButton label="Payments coming soon" variant="accent" onPress={() => {}} disabled />
          </View>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            className="mt-[14px] items-center py-sm"
          >
            <Text className="font-sans-bold text-[13px] text-night-text">
              {fromOnboarding ? 'Continue with Free' : 'Not now'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
