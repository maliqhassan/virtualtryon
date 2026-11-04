import * as Haptics from 'expo-haptics';
import type { Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { Platform, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { themeColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { AppIcon } from './app-icon';
import { PressableScale } from './pressable-scale';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Left-to-right order in the bar. Try-On is the raised centre button. */
const ORDER = ['index', 'wardrobe', 'tryon', 'shop', 'you'] as const;
const CENTER = 'tryon';
const ICONS: Record<string, string> = {
  index: 'wb_twilight',
  wardrobe: 'checkroom',
  shop: 'shopping_bag',
  you: 'person',
};

/** Light on most tabs; the bar turns dark on the Try-On stage. */
const PALETTE = {
  light: {
    stage: themeColors.background,
    bar: 'rgba(255, 255, 255, 0.94)',
    border: 'rgba(22, 19, 15, 0.08)',
    active: themeColors.inkPrimary,
    inactive: themeColors.neutral400,
    pill: 'rgba(22, 19, 15, 0.07)',
  },
  dark: {
    stage: themeColors.night,
    bar: 'rgba(28, 26, 23, 0.92)',
    border: 'rgba(255, 255, 255, 0.08)',
    active: themeColors.nightText,
    inactive: themeColors.inkSecondary,
    pill: 'rgba(255, 255, 255, 0.1)',
  },
} as const;

type Palette = (typeof PALETTE)[keyof typeof PALETTE];

const BAR_SHADOW = '0px 10px 28px rgba(22, 19, 15, 0.14)';

function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

function TabItem({
  label,
  icon,
  focused,
  palette,
  onPress,
}: {
  label: string;
  icon: string;
  focused: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = reducedMotion
      ? focused
        ? 1
        : 0
      : withTiming(focused ? 1 : 0, { duration: 220 });
  }, [active, focused, reducedMotion]);

  const highlight = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: 0.6 + active.value * 0.4 }],
  }));

  const color = focused ? palette.active : palette.inactive;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      pressedScale={0.92}
      // Inline flex as well as the class: equal widths must hold on every
      // Android phone, not just where NativeWind applies the class.
      containerStyle={{ flex: 1 }}
      className="items-center justify-center"
    >
      <View className="h-[30px] w-12 items-center justify-center">
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 48,
              height: 30,
              borderRadius: 999,
              backgroundColor: palette.pill,
            },
            highlight,
          ]}
        />
        <AppIcon name={icon} size="lg" color={color} />
      </View>
      <Text
        numberOfLines={1}
        className="mt-[3px] font-mono-semibold text-[9.5px]"
        style={{ color, lineHeight: 12 }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function CenterItem({
  label,
  focused,
  palette,
  onPress,
}: {
  label: string;
  focused: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      pressedScale={0.92}
      containerStyle={{ flex: 1 }}
      className="items-center"
    >
      <View
        className="h-[58px] w-[58px] items-center justify-center rounded-full bg-inverse"
        style={{
          marginTop: -30,
          // The ring matches the stage, so the button looks cut out of the bar.
          borderWidth: 4,
          borderColor: palette.stage,
          boxShadow: '0px 8px 18px rgba(22, 19, 15, 0.3)',
        }}
      >
        <AppIcon
          name="auto_awesome"
          size={25}
          color={focused ? themeColors.goldSoft : themeColors.cream}
        />
      </View>
      <Text
        numberOfLines={1}
        className="mt-[3px] font-mono-semibold text-[9.5px]"
        style={{ color: focused ? palette.active : palette.inactive, lineHeight: 12 }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Floating pill tab bar with a raised Try-On button.
 *
 * Android: since SDK 55 apps draw edge-to-edge, so the system navigation bar
 * sits on top of the app. `insets.bottom` is that bar's real height (gesture
 * pill, 3-button bar, or none), and the bar is lifted by exactly that much,
 * so it never overlaps the system buttons on any phone.
 */
export function FloatingTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const bottomGap = Math.max(insets.bottom, 12);
  const palette = state.routes[state.index]?.name === CENTER ? PALETTE.dark : PALETTE.light;

  const routes = ORDER.map((name) => state.routes.find((route) => route.name === name)).filter(
    (route): route is (typeof state.routes)[number] => route !== undefined,
  );

  return (
    <View
      style={{
        paddingBottom: bottomGap,
        paddingTop: 10,
        paddingLeft: Math.max(insets.left, 14),
        paddingRight: Math.max(insets.right, 14),
        backgroundColor: palette.stage,
      }}
    >
      <View
        accessibilityRole="tablist"
        className="flex-row items-center rounded-[28px] px-xs"
        style={{
          height: 66,
          backgroundColor: palette.bar,
          borderWidth: 1,
          borderColor: palette.border,
          boxShadow: BAR_SHADOW,
        }}
      >
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const options = descriptors[route.key]?.options;
          const label = typeof options?.title === 'string' ? options.title : route.name;

          const onPress = () => {
            tapFeedback();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return route.name === CENTER ? (
            <CenterItem
              key={route.key}
              label={label}
              focused={focused}
              palette={palette}
              onPress={onPress}
            />
          ) : (
            <TabItem
              key={route.key}
              label={label}
              icon={ICONS[route.name] ?? 'circle'}
              focused={focused}
              palette={palette}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}
