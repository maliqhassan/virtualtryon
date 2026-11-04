import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type GestureResponderEvent, Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FadeInView } from '@/components/fade-in-view';
import { GradientFill } from '@/components/gradient-fill';
import { StripeFill } from '@/components/stripe-fill';

import { OnboardingFrame } from '../components/onboarding-frame';
import { StoryBars } from '../components/story-bars';
import { SIGN_IN_HREF } from '../routes';

const SLIDES = [
  {
    tag: '01 · Your closet',
    a: 'Everything you own,',
    b: 'finally styled.',
    body: 'Photograph your clothes once. Noor learns your shape, shade and taste, then helps you dress every morning.',
    image: '[ hero · warm flat-lay of a real closet ]',
  },
  {
    tag: '02 · Try before you wear',
    a: 'See it on you',
    b: 'before you buy.',
    body: 'Any piece from your wardrobe or any store, shown on your own photo in about a minute.',
    image: '[ hero · try-on before / after ]',
  },
  {
    tag: '03 · Meet Noor',
    a: 'A stylist who knows',
    b: 'your shape and shade.',
    body: 'Ask for a mehndi look, shoes for Friday, or what colour suits you. Every answer comes with a reason.',
    image: '[ hero · portrait in warm window light ]',
  },
] as const;

const SWIPE_DISTANCE = 40;

/** Three story-style slides; swipe or tap Continue. Skip goes to sign-in. */
export function WelcomeScreen() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => (isLast ? router.push(SIGN_IN_HREF) : setIndex(index + 1));
  const onTouchEnd = (event: GestureResponderEvent) => {
    if (touchStartX.current === null) return;
    const dx = event.nativeEvent.pageX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -SWIPE_DISTANCE) next();
    else if (dx > SWIPE_DISTANCE && index > 0) setIndex(index - 1);
  };

  return (
    <View
      className="flex-1"
      onTouchStart={(event) => (touchStartX.current = event.nativeEvent.pageX)}
      onTouchEnd={onTouchEnd}
    >
      <OnboardingFrame
        dark
        scroll={false}
        backdrop={
          <>
            <StripeFill tone="dark" period={9} />
            <Text className="absolute left-0 right-0 top-[120px] text-center font-mono text-[10px] text-[rgba(246,241,232,0.38)]">
              {slide.image}
            </Text>
            <GradientFill
              kind="linear"
              stops={[
                { offset: 0, color: '#12110F', opacity: 0.35 },
                { offset: 0.22, color: '#12110F', opacity: 0 },
                { offset: 0.42, color: '#12110F', opacity: 0.2 },
                { offset: 0.7, color: '#12110F', opacity: 0.94 },
                { offset: 1, color: '#12110F' },
              ]}
            />
          </>
        }
      >
        <StoryBars count={SLIDES.length} current={index} />
        <Pressable
          onPress={() => router.push(SIGN_IN_HREF)}
          accessibilityRole="button"
          hitSlop={10}
          className="self-end py-sm"
        >
          <Text className="font-sans-semibold text-[12.5px] text-[rgba(246,241,232,0.75)]">
            Skip
          </Text>
        </Pressable>

        <View className="mt-auto pb-xl">
          <FadeInView key={index}>
            <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-gold-overline">
              {slide.tag}
            </Text>
            <Text
              className="mt-[14px] font-display text-[42px] leading-[43px] text-cream"
              accessibilityRole="header"
            >
              {slide.a}
              {'\n'}
              <Text className="font-display-italic text-gold-soft">{slide.b}</Text>
            </Text>
            <Text className="mt-[14px] font-sans text-[14.5px] leading-[23px] text-night-body">
              {slide.body}
            </Text>
          </FadeInView>
          <View className="mt-[26px]">
            <AppButton label={isLast ? 'Get started' : 'Continue'} variant="cream" onPress={next} />
          </View>
          <Pressable
            onPress={() => router.push(SIGN_IN_HREF)}
            accessibilityRole="button"
            hitSlop={8}
            className="mt-lg items-center"
          >
            <Text className="font-sans-semibold text-[12.5px] text-neutral-400">
              I already have an account
            </Text>
          </Pressable>
        </View>
      </OnboardingFrame>
    </View>
  );
}
