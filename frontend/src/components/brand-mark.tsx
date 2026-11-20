import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { themeColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// The logo on its 1024 grid (the same drawing as assets/images/icon.png,
// made by scripts/draw-logo.py): a clothes hanger whose hook is a
// four-point spark. The view box is cropped to the drawing.
const VIEW_BOX = '140 186 744 650';
/** Width / height of the drawn mark. */
export const BRAND_MARK_ASPECT = 744 / 650;
const SPARK =
  'M512 196 C512 268 580 336 652 336 C580 336 512 404 512 476 ' +
  'C512 404 444 336 372 336 C444 336 512 268 512 196 Z';
const HANGER = 'M512 546 L836 788 L188 788 Z';

type BrandMarkProps = {
  width?: number;
  color?: string;
};

/** The brand mark, `width` wide, in gold unless told otherwise. */
export function BrandMark({ width = 72, color = themeColors.goldSoft }: BrandMarkProps) {
  return (
    <Svg
      width={width}
      height={width / BRAND_MARK_ASPECT}
      viewBox={VIEW_BOX}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={SPARK} fill={color} />
      <Path
        d={HANGER}
        fill="none"
        stroke={color}
        strokeWidth={76}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * The mark breathing while the app works (onboarding's "Reading your
 * proportions"): opacity .55 → 1 and scale 1 → 1.07, 1.5s each way. Still
 * and fully visible with reduce motion on.
 */
export function BreathingMark(props: BrandMarkProps) {
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
    <Animated.View style={style} pointerEvents="none">
      <BrandMark {...props} />
    </Animated.View>
  );
}
