import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  radius?: number;
};

/** A soft pulsing placeholder shown while content loads. Static with reduced motion. */
export function Skeleton({ width = '100%', height, aspectRatio, radius = 16 }: SkeletonProps) {
  const pulse = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.35 }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, aspectRatio, borderRadius: radius, backgroundColor: '#E2DED6' },
        style,
      ]}
    />
  );
}
