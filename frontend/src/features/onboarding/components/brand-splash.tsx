import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BRAND_MARK_ASPECT, BrandMark } from '@/components/brand-mark';
import { ScreenStatusBar } from '@/components/screen-status-bar';

const MARK_WIDTH = 88;
const SHOW_MS = 1800;
const FADE_MS = 300;

/**
 * The brand moment on a cold start: the logo, the name and one line on the
 * plain night background, for 1.8s or until tapped. Drawn over the navigator rather
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
        <ScreenStatusBar style="light" />
        {/* Centred, the size the native splash shows it (app.json imageWidth
            188 × the mark's 47% of splash-icon.png), so the hand-over from
            the native splash doesn't move it. */}
        <BrandMark width={MARK_WIDTH} />
        <View
          className="absolute left-0 right-0 top-1/2 items-center"
          style={{ marginTop: MARK_WIDTH / BRAND_MARK_ASPECT / 2 + 32 }}
        >
          <Text className="font-display text-[44px] leading-[48px] text-cream">AI Stylist</Text>
          <Text className="mt-sm font-sans text-[15px] text-neutral-400">Dress with certainty</Text>
        </View>
        <Text className="absolute bottom-[70px] font-mono text-[11px] tracking-[1.9px] text-neutral-400">
          TAP TO BEGIN
        </Text>
      </Pressable>
    </Animated.View>
  );
}
