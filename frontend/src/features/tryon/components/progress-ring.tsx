import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { themeColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Matches the h-/w-[136px] box below (and the 128px face inside the stroke).
const SIZE = 136;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The generating ring (handoff v2.1 change 5): a gold arc filling 0-100%
 * around the percentage. The arc eases to each new value (an animated
 * strokeDashoffset), or jumps with reduced motion on.
 */
export function ProgressRing({ progress }: { progress: number }) {
  const reducedMotion = useReducedMotion();
  const filled = useSharedValue(progress / 100);

  useEffect(() => {
    filled.value = reducedMotion ? progress / 100 : withTiming(progress / 100, { duration: 450 });
  }, [filled, progress, reducedMotion]);

  const arc = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - filled.value),
  }));

  const percent = Math.round(progress);
  return (
    <View
      className="h-[136px] w-[136px] items-center justify-center rounded-full"
      style={{ boxShadow: '0px 0px 46px rgba(231, 199, 122, 0.38)' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={themeColors.goldSoft}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={arc}
          // Start at 12 o'clock and fill clockwise.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View className="h-[128px] w-[128px] items-center justify-center rounded-full bg-[rgba(28,22,16,0.72)]">
        <Text className="font-display text-[40px] leading-[42px] text-cream">{percent}%</Text>
      </View>
    </View>
  );
}
