import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { themeColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export type ThinkingIndicatorProps = {
  size?: number;
  /**
   * Required, not optional: the design system's strongest motion rule is
   * "never a bare spinner" — this orb never appears without naming what's
   * actually happening.
   */
  step: string;
};

/**
 * Replaces every loading spinner in the product (design/react-native
 * component inventory). Built shared from the start, not after a second
 * consumer appeared — the design spec already names it as reused by
 * try-on generation, onboarding analysis, chat typing, and pull-to-refresh.
 * First real use of react-native-reanimated in this app.
 */
export function ThinkingIndicator({ size = 70, step }: ThinkingIndicatorProps) {
  const pulse = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = 1; // static "on" dot rather than a pulsing orb
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));

  return (
    <View className="items-center gap-md">
      {/* Colour via style, not className: NativeWind classes on a Reanimated
          view don't apply on web, which left the orb invisible there. */}
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: themeColors.primary,
          },
          animatedStyle,
        ]}
      />
      <Text className="text-center text-ink-secondary" accessibilityLiveRegion="polite">
        {step}
      </Text>
    </View>
  );
}
