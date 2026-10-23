import { type ReactNode, useEffect } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type FadeInViewProps = {
  children: ReactNode;
  /** Position in a list, for a short stagger (design system: 40ms steps). */
  index?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Content rises 10dp and fades in when it first appears. Motion here shows
 * new content arriving; it isn't decoration. With "reduce motion" on, the
 * content appears instantly.
 *
 * Built from opacity/translate only, not Reanimated's `entering` layout
 * animations: on web those position the view absolutely while they run,
 * which collapsed its container and made the next content overlap it.
 * Layout classes go on a plain View, which NativeWind styles reliably on
 * every platform.
 */
export function FadeInView({ children, index = 0, className, style }: FadeInViewProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.set(1);
      return;
    }
    progress.set(
      withDelay(
        Math.min(index, 8) * 40,
        withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [index, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return (
    <View className={className} style={style}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </View>
  );
}
