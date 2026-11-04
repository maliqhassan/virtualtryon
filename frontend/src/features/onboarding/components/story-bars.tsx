import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { themeColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

function StoryBar({ filled }: { filled: boolean }) {
  const reducedMotion = useReducedMotion();
  const width = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    const target = filled ? 1 : 0;
    width.set(reducedMotion ? target : withTiming(target, { duration: 300 }));
  }, [filled, reducedMotion, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));
  return (
    <View className="h-[3px] flex-1 overflow-hidden rounded-full bg-[rgba(246,241,232,0.22)]">
      <Animated.View
        style={[{ height: 3, borderRadius: 999, backgroundColor: themeColors.cream }, fill]}
      />
    </View>
  );
}

/** Instagram-story style progress: one bar per welcome slide. */
export function StoryBars({ count, current }: { count: number; current: number }) {
  return (
    <View
      className="flex-row gap-[6px]"
      accessibilityRole="progressbar"
      accessibilityLabel={`Slide ${current + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <StoryBar key={i} filled={i <= current} />
      ))}
    </View>
  );
}
