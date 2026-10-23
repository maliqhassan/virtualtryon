import { useCallback } from 'react';
import { Pressable, type PressableProps, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  /** How far it shrinks while pressed (design system: buttons 0.98). */
  pressedScale?: number;
  /** Visual classes (colours, borders, padding). These may change between renders. */
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Layout classes for the outer wrapper (flex-1, width, margins). Keep these fixed. */
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A Pressable that gently shrinks while held, for tactile feedback on
 * buttons and cards. Skipped when the system "reduce motion" setting is on.
 *
 * Three layers on purpose: a plain View takes the layout classes, the
 * animated view only scales, and the inner Pressable carries the visual
 * classes. NativeWind styles plain components reliably; on animated views
 * it dropped layout on Android and didn't re-apply changed colours.
 */
export function PressableScale({
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  className,
  style,
  containerClassName,
  containerStyle,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      if (!reducedMotion) scale.set(withSpring(pressedScale, SPRING));
      onPressIn?.(event);
    },
    [onPressIn, pressedScale, reducedMotion, scale],
  );
  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.set(withSpring(1, SPRING));
      onPressOut?.(event);
    },
    [onPressOut, scale],
  );

  return (
    // Layout classes go on a plain View: NativeWind doesn't reliably apply
    // className to animated views on native (flex-1 was dropped on Android,
    // bunching the tab bar items). The animated view only scales.
    <View className={containerClassName} style={containerStyle}>
      <Animated.View style={animatedStyle}>
        <Pressable
          {...rest}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className={className}
          style={style}
        />
      </Animated.View>
    </View>
  );
}
