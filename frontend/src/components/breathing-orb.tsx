import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { GradientFill } from './gradient-fill';

type BreathingOrbProps = {
  size: number;
  /** brand: gold-to-clay (splash) · glow: soft clay haze (analysing, thinking). */
  tone?: 'brand' | 'glow';
};

const BRAND_STOPS = [
  { offset: 0, color: '#E7C77A' },
  { offset: 0.6, color: '#B4713F' },
  { offset: 0.72, color: '#B4713F', opacity: 0 },
  { offset: 1, color: '#B4713F', opacity: 0 },
];
const GLOW_STOPS = [
  { offset: 0, color: '#D9A56B' },
  { offset: 0.4, color: '#B4713F', opacity: 0.55 },
  { offset: 0.7, color: '#B4713F', opacity: 0 },
  { offset: 1, color: '#B4713F', opacity: 0 },
];

/**
 * The "machine is thinking" orb: opacity .55 → 1 and scale 1 → 1.07,
 * 1.5s each way. Still (fully visible) with reduce motion on.
 */
export function BreathingOrb({ size, tone = 'glow' }: BreathingOrbProps) {
  const reducedMotion = useReducedMotion();
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(breath);
      breath.set(1);
      return;
    }
    breath.set(0);
    breath.set(
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
    return () => cancelAnimation(breath);
  }, [breath, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + breath.get() * 0.45,
    transform: [{ scale: 1 + breath.get() * 0.07 }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <View style={{ width: size, height: size }}>
        <GradientFill
          kind="radial"
          center={tone === 'brand' ? { x: 0.35, y: 0.3 } : { x: 0.5, y: 0.5 }}
          radius={tone === 'brand' ? { x: 0.75, y: 0.75 } : { x: 0.5, y: 0.5 }}
          stops={tone === 'brand' ? BRAND_STOPS : GLOW_STOPS}
        />
      </View>
    </Animated.View>
  );
}
