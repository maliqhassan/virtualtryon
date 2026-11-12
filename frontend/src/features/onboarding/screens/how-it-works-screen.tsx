import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type GestureResponderEvent, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { FadeInView } from '@/components/fade-in-view';
import { PhotoFill, PhotoLabel } from '@/components/photo-fill';
import type { StockPhoto } from '@/constants/stock-photos';
import { themeColors } from '@/constants/theme';

import { OnboardingFrame } from '../components/onboarding-frame';
import { StepHeader } from '../components/step-header';
import { PHOTO_TIPS_HREF } from '../routes';

const STEPS = [
  {
    title: 'Add one photo of you',
    body: 'Front-facing, head to toe. We remove the background and keep it private.',
  },
  { title: 'Pick a piece', body: 'From your wardrobe, a lookbook, or a link you spotted online.' },
  {
    title: 'See it on you',
    body: 'A realistic try-on in about a minute, with a fit score and the reason behind it.',
  },
] as const;

const DASHED = {
  borderWidth: 1.5,
  borderStyle: 'dashed',
  borderColor: 'rgba(22, 19, 15, 0.2)',
} as const;

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = position[0] === 't';
  const left = position[1] === 'l';
  return (
    <View
      className="absolute h-6 w-6"
      style={{
        [top ? 'top' : 'bottom']: 16,
        [left ? 'left' : 'right']: 16,
        [top ? 'borderTopWidth' : 'borderBottomWidth']: 2,
        [left ? 'borderLeftWidth' : 'borderRightWidth']: 2,
        borderColor: themeColors.primary,
        [`border${top ? 'Top' : 'Bottom'}${left ? 'Left' : 'Right'}Radius`]: 8,
      }}
    />
  );
}

function Tile({ photo, label, flex = 1 }: { photo: StockPhoto; label: string; flex?: number }) {
  return (
    <View className="justify-end overflow-hidden rounded-[20px] bg-muted p-[9px]" style={{ flex }}>
      <PhotoFill photo={photo} position="center" />
      <PhotoLabel>{label}</PhotoLabel>
    </View>
  );
}

function StepMockup({ step }: { step: number }) {
  if (step === 0) {
    return (
      <View className="flex-1 overflow-hidden rounded-[24px] bg-muted">
        <PhotoFill photo="tipSoloFront" />
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <Corner key={corner} position={corner} />
        ))}
      </View>
    );
  }
  if (step === 1) {
    return (
      <View className="flex-1 flex-row gap-[6px]">
        <View className="flex-1 gap-[6px]">
          <Tile photo="welcomeCloset" label="wardrobe" />
          <Tile photo="lookVelvet" label="lookbook" />
        </View>
        <View className="overflow-hidden rounded-[20px] bg-inverse" style={{ flex: 1.3 }}>
          <View className="absolute bottom-[44px] left-0 right-0 top-0">
            <PhotoFill photo="welcomeTryOn" />
          </View>
          <View className="absolute left-[10px] right-[10px] top-[10px] flex-row gap-[3px]">
            <View className="h-[2px] flex-1 rounded-full bg-cream" />
            <View className="h-[2px] flex-1 rounded-full bg-[rgba(246,241,232,0.3)]" />
            <View className="h-[2px] flex-1 rounded-full bg-[rgba(246,241,232,0.3)]" />
          </View>
          <View className="absolute bottom-[10px] left-[10px] right-[10px] flex-row items-center gap-[6px]">
            <AppIcon name="link" size={16} color={themeColors.goldSoft} />
            <Text className="font-sans-semibold text-[9.5px] text-night-text">paste any link</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View className="flex-1 flex-row overflow-hidden rounded-[24px]">
      {/* The same person in two outfits, so it reads as a real before and after. */}
      <View className="flex-1 bg-muted p-[10px]">
        <PhotoFill photo="styleMMinimal" />
        <PhotoLabel>BEFORE</PhotoLabel>
      </View>
      <View className="w-[2px] bg-surface" />
      <View className="flex-1 bg-muted p-[10px]">
        <PhotoFill photo="sameManAfter" />
        <PhotoLabel>AFTER</PhotoLabel>
      </View>
      <View className="absolute bottom-md left-md right-md flex-row items-center gap-sm rounded-lg bg-[rgba(22,19,15,0.72)] px-md py-[10px]">
        <AppIcon name="auto_awesome" size={15} color={themeColors.goldSoft} />
        <Text className="flex-1 font-sans-semibold text-[11px] text-cream">Reads well on you</Text>
        <Text className="font-display text-[22px] leading-[22px] text-gold-soft">91</Text>
      </View>
    </View>
  );
}

/** Step 3 of 5: a three-step explainer with peeking side cards. */
export function HowItWorksScreen() {
  const [step, setStep] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : router.push(PHOTO_TIPS_HREF));
  const onTouchEnd = (event: GestureResponderEvent) => {
    if (touchStartX.current === null) return;
    const dx = event.nativeEvent.pageX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -40) next();
    else if (dx > 40 && step > 0) setStep(step - 1);
  };

  return (
    <OnboardingFrame
      scroll={false}
      footer={<AppButton label={step < STEPS.length - 1 ? 'Next' : 'Continue'} onPress={next} />}
    >
      <StepHeader step={3} />
      <View className="mt-[22px] items-center">
        <Text className="font-sans-bold text-[26px] leading-[29px] tracking-[-0.52px] text-ink-primary">
          Your new look in
        </Text>
        <Text className="font-display-italic text-[38px] leading-[42px] text-primary">
          3 simple steps
        </Text>
      </View>

      <View
        className="mt-[22px] h-[340px]"
        onTouchStart={(event) => (touchStartX.current = event.nativeEvent.pageX)}
        onTouchEnd={onTouchEnd}
      >
        <View
          className="absolute -left-[58px] bottom-[30px] top-[30px] w-[70px] rounded-[24px] p-xs"
          style={DASHED}
        >
          <View className="flex-1 overflow-hidden rounded-[19px] bg-muted">
            <PhotoFill photo="lookYellow" position="center" />
          </View>
        </View>
        <View
          className="absolute -right-[58px] bottom-[30px] top-[30px] w-[70px] rounded-[24px] p-xs"
          style={DASHED}
        >
          <View className="flex-1 overflow-hidden rounded-[19px] bg-muted">
            <PhotoFill photo="lookPinkTrousers" position="center" />
          </View>
        </View>
        <FadeInView key={step} className="absolute left-xxl right-xxl top-0">
          <View
            className="h-[340px] rounded-[30px] p-[6px]"
            style={{ ...DASHED, borderColor: 'rgba(22, 19, 15, 0.22)' }}
          >
            <StepMockup step={step} />
          </View>
        </FadeInView>
      </View>

      <View className="mt-xl items-center">
        <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-inverse">
          <Text className="font-sans-bold text-[14px] text-ink-onPrimary">{step + 1}</Text>
        </View>
        <Text className="mt-md font-sans-bold text-[15px] text-ink-primary">
          {STEPS[step].title}
        </Text>
        <Text className="mt-xs max-w-[290px] text-center font-sans text-[13px] leading-[20px] text-ink-secondary">
          {STEPS[step].body}
        </Text>
      </View>
    </OnboardingFrame>
  );
}
