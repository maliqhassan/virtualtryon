import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BreathingOrb } from '@/components/breathing-orb';
import { NightGlow } from '@/components/gradient-fill';

const SHOW_MS = 1800;
const FADE_MS = 300;

/**
 * The brand moment on a cold start: orb, wordmark and tagline over the
 * night glow, for 1.8s or until tapped. Drawn over the navigator rather
 * than as a route, because "/" is already Today.
 *
 * Fades with a plain opacity animation and unmounts on a timer, not with
 * Reanimated's `exiting` (which stalls part-way on web).
 */
export function BrandSplash() {
  const [phase, setPhase] = useState<'shown' | 'fading' | 'gone'>('shown');
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (phase === 'shown') {
      const timer = setTimeout(() => setPhase('fading'), SHOW_MS);
      return () => clearTimeout(timer);
    }
    if (phase === 'fading') {
      opacity.set(withTiming(0, { duration: FADE_MS }));
      const timer = setTimeout(() => setPhase('gone'), FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [opacity, phase]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  if (phase === 'gone') return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, fade]}
      pointerEvents={phase === 'shown' ? 'auto' : 'none'}
    >
      <Pressable
        onPress={() => setPhase('fading')}
        accessibilityRole="button"
        accessibilityLabel="AI Stylist. Tap to begin."
        className="flex-1 items-center justify-center bg-night"
      >
        <NightGlow center={{ x: 0.5, y: 0.38 }} />
        <BreathingOrb size={96} tone="brand" />
        <Text className="mt-[28px] font-display text-[52px] leading-[54px] text-cream">
          AI Stylist
        </Text>
        <Text className="mt-[10px] font-display-italic text-[19px] text-[#C9B896]">
          dress with certainty
        </Text>
        <Text className="absolute bottom-[70px] font-mono text-[9.5px] tracking-[1.9px] text-ink-secondary">
          TAP TO BEGIN
        </Text>
      </Pressable>
    </Animated.View>
  );
}
