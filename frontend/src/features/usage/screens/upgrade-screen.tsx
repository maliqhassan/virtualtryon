import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { GradientFill } from '@/components/gradient-fill';
import { IconButton } from '@/components/icon-button';
import { ScreenStatusBar } from '@/components/screen-status-bar';
import { PhotoFill, PhotoLabel } from '@/components/photo-fill';
import { StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';

import { describeUsage } from '../components/usage-pill';
import { useUsageQuery } from '../hooks/use-usage-query';
import { FREE_CREDITS, PLAN_OFFERS, type PlanId, type PlanOffer, type Usage } from '../types';

const BENEFITS = [
  'One credit = one try-on, and failed ones are free',
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

/** What the user has now: the first thing to know before choosing a plan. */
function BalanceCard({ usage }: { usage: Usage }) {
  return (
    <View className="mt-lg flex-row items-center gap-md rounded-xxl border border-[rgba(231,199,122,0.25)] bg-[rgba(201,162,39,0.08)] px-lg py-md">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[rgba(201,162,39,0.18)]">
        <AppIcon name="auto_awesome" size={20} color={themeColors.goldSoft} />
      </View>
      <View className="flex-1">
        <Text className="font-sans-semibold text-[11px] uppercase tracking-[1.2px] text-neutral-400">
          Your balance
        </Text>
        <Text className="mt-[2px] font-sans-semibold text-[14px] leading-[19px] text-cream">
          {describeUsage(usage)}
        </Text>
      </View>
      <Text className="font-display text-[30px] text-gold-soft" accessibilityElementsHidden>
        {usage.unlimited ? '∞' : usage.remaining}
      </Text>
    </View>
  );
}

/** A plan as a radio card: the number of credits leads, the price follows. */
function PlanCard({
  offer,
  selected,
  current,
  onSelect,
}: {
  offer: PlanOffer;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${offer.name}: ${offer.credits} credits for ${offer.price} a ${offer.per}${
        current ? ', your plan' : ''
      }`}
      className="flex-1 rounded-xxl p-[14px]"
      style={{
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? themeColors.goldSoft : 'rgba(255, 255, 255, 0.14)',
        backgroundColor: selected ? 'rgba(201, 162, 39, 0.08)' : 'rgba(255, 255, 255, 0.03)',
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
          <Text className="font-sans-bold text-[11px] text-[#1A1509]">Most credits</Text>
        </View>
      )}
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-bold text-[13.5px] text-night-text">{offer.name}</Text>
        <AppIcon
          name={selected ? 'radio_button_checked' : 'radio_button_unchecked'}
          size="sm"
          color={selected ? themeColors.goldSoft : themeColors.neutral400}
        />
      </View>
      <View className="mt-md flex-row items-baseline gap-[5px]">
        <Text className="font-display text-[34px] leading-[38px] text-cream">{offer.credits}</Text>
        <Text className="font-sans text-[12px] text-neutral-400">credits</Text>
      </View>
      <Text className="font-sans text-[11.5px] text-neutral-400">
        every {offer.per}
        {current ? ' · your plan' : ''}
      </Text>
      <View className="mt-md h-px bg-[rgba(255,255,255,0.1)]" />
      <Text className="mt-sm font-sans-bold text-[16px] text-cream">
        {offer.price}
        <Text className="font-sans text-[12px] text-neutral-400"> / {offer.per}</Text>
      </Text>
    </Pressable>
  );
}

/**
 * Plans on the dark stage: a before/after hero, the user's balance, the
 * benefits, and Weekly / Monthly as radio cards (app/services/plans.py has
 * the real numbers). The close button and the actions stay on screen while
 * the page scrolls. Buying isn't possible yet (in-app purchase is a later
 * feature), so the main button says so instead of pretending.
 */
export function UpgradeScreen() {
  const usage = useUsageQuery().data;
  // At the end of onboarding nothing is behind this screen: leave to Today.
  const fromOnboarding = useLocalSearchParams<{ from?: string }>().from === 'onboarding';
  const close = () => (fromOnboarding ? router.replace('/') : router.back());
  const paid = PLAN_OFFERS.filter((offer) => offer.per !== null);
  const [selected, setSelected] = useState<PlanId>('monthly');
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-night">
      <ScreenStatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="h-[300px] overflow-hidden" accessibilityElementsHidden>
          <StripeFill tone="dark" period={10} />
          <View
            className="absolute left-[22px] top-[64px] h-[200px] w-[42%] justify-end overflow-hidden rounded-[24px] bg-night-surface p-md"
            style={{ transform: [{ rotate: '-4deg' }] }}
          >
            <PhotoFill photo="styleMMinimal" />
            <PhotoLabel tone="dark">before · your photo</PhotoLabel>
          </View>
          <View
            className="absolute right-[18px] top-[48px] h-[226px] w-[46%] justify-end overflow-hidden rounded-[24px] bg-night-surface p-md"
            style={{ transform: [{ rotate: '3deg' }] }}
          >
            <PhotoFill photo="sameManAfter" />
            <PhotoLabel tone="dark">after · your try-on</PhotoLabel>
          </View>
          <GlassChip label="#Office" style={{ left: 12, top: 196 }} />
          <GlassChip label="#Rehearsal dinner" style={{ right: 14, top: 222 }} />
          <GradientFill
            kind="linear"
            stops={[
              { offset: 0.55, color: '#12110F', opacity: 0 },
              { offset: 1, color: '#12110F' },
            ]}
          />
        </View>

        <View className="-mt-[18px] px-[22px]">
          <Text
            className="font-display text-[36px] leading-[38px] text-cream"
            accessibilityRole="header"
          >
            More credits,{'\n'}
            <Text className="font-display-italic text-gold-soft">more looks.</Text>
          </Text>

          {usage && <BalanceCard usage={usage} />}

          <View className="mt-lg gap-[11px]">
            {BENEFITS.map((benefit) => (
              <View key={benefit} className="flex-row items-center gap-md">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-[rgba(201,162,39,0.16)]">
                  <AppIcon name="check" size={16} color={themeColors.goldSoft} />
                </View>
                <Text className="flex-1 font-sans text-[14px] leading-[19px] text-[#D8D1C5]">
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          <Text className="mb-md mt-xl font-sans-semibold text-[11px] uppercase tracking-[1.2px] text-neutral-400">
            Choose a plan
          </Text>
          <View className="flex-row gap-[10px]" accessibilityRole="radiogroup">
            {paid.map((offer) => (
              <PlanCard
                key={offer.id}
                offer={offer}
                selected={selected === offer.id}
                current={usage?.plan === offer.id}
                onSelect={() => {
                  selectionFeedback();
                  setSelected(offer.id);
                }}
              />
            ))}
          </View>

          <Text className="mt-lg text-center font-sans text-[11.5px] leading-[16px] text-neutral-400">
            You start with {FREE_CREDITS} free credits. Payments open soon, so nothing is charged
            today.
          </Text>
        </View>
      </ScrollView>

      {/* Pinned, so the way out is never below the fold. */}
      <View
        className="border-t border-[rgba(255,255,255,0.08)] bg-night px-[22px] pt-md"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <AppButton label="Payments coming soon" variant="accent" onPress={() => {}} disabled />
        <Pressable onPress={close} accessibilityRole="button" className="mt-xs items-center py-sm">
          <Text className="font-sans-bold text-[13.5px] text-night-text">
            {fromOnboarding ? 'Continue with Free' : 'Not now'}
          </Text>
        </Pressable>
      </View>

      {/* Outside the scroll view, so it never scrolls away. */}
      <SafeAreaView edges={['top']} className="absolute right-[18px] top-0">
        <View className="mt-md">
          <IconButton icon="close" tone="glass" accessibilityLabel="Close" onPress={close} />
        </View>
      </SafeAreaView>
    </View>
  );
}
