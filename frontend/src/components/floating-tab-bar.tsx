import type { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { themeColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { selectionFeedback } from '@/lib/haptics';

import { AppIcon } from './app-icon';
import { BrandMark } from './brand-mark';
import { GradientFill } from './gradient-fill';
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

/** The bar's colours. (It used to turn dark on Try-On; the studio hides it.) */
const PALETTE = {
  bar: 'rgba(255, 255, 255, 0.96)',
  border: 'rgba(22, 19, 15, 0.08)',
  active: themeColors.inkPrimary,
  // Labels are text, so the AA-passing grey (neutral400 is for icons only).
  inactive: themeColors.neutral500,
  pill: 'rgba(22, 19, 15, 0.07)',
} as const;

type Palette = typeof PALETTE;

const BAR_SHADOW = '0px 10px 28px rgba(22, 19, 15, 0.14)';
const BAR_HEIGHT = 66;
const BAR_TOP_GAP = 10;
const bottomGapFor = (insetBottom: number) => Math.max(insetBottom, 12);

/** How much of the bottom of a tab screen the floating bar covers. */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return BAR_TOP_GAP + BAR_HEIGHT + bottomGapFor(insets.bottom);
}

/** Bottom padding for a list in a tab, so its last item scrolls clear of
 * the floating bar. */
export function useTabBarSpace(): number {
  return useTabBarHeight() + 16;
}

/** Android: the bar would ride up on the keyboard and cover the field being
 * typed in (Shop search), so it steps aside while the keyboard is open. */
function useKeyboardOpen(): boolean {
  // Already open when the bar mounts (it remounts with the tabs) counts too.
  const [open, setOpen] = useState(() => Platform.OS === 'android' && Keyboard.isVisible());
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const shown = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return open;
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
        className="mt-[3px] font-mono-semibold text-[11px]"
        style={{ color, lineHeight: 14 }}
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
          boxShadow: '0px 8px 18px rgba(22, 19, 15, 0.3)',
        }}
      >
        <BrandMark width={27} color={focused ? themeColors.goldSoft : themeColors.cream} />
      </View>
      <Text
        numberOfLines={1}
        className="mt-[3px] font-mono-semibold text-[11px]"
        style={{ color: focused ? palette.active : palette.inactive, lineHeight: 14 }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Floating pill tab bar with a raised Try-On button. It floats over the
 * screen (no strip behind it); a soft fade keeps it readable as content
 * scrolls underneath, and lists pad their end with `useTabBarSpace`.
 *
 * Android: since SDK 55 apps draw edge-to-edge, so the system navigation bar
 * sits on top of the app. `insets.bottom` is that bar's real height (gesture
 * pill, 3-button bar, or none), and the bar is lifted by exactly that much,
 * so it never overlaps the system buttons on any phone.
 */
export function FloatingTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const keyboardOpen = useKeyboardOpen();
  // The Try-On studio is full screen, with its own back button (handoff v2.1 change 4).
  if (state.routes[state.index]?.name === CENTER || keyboardOpen) return null;
  const bottomGap = bottomGapFor(insets.bottom);
  const palette = PALETTE;

  const routes = ORDER.map((name) => state.routes.find((route) => route.name === name)).filter(
    (route): route is (typeof state.routes)[number] => route !== undefined,
  );

  return (
    <View
      // Taps outside the pill reach the screen below.
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: bottomGap,
        paddingTop: BAR_TOP_GAP,
        paddingLeft: Math.max(insets.left, 14),
        paddingRight: Math.max(insets.right, 14),
      }}
    >
      {/* Solid at the bottom, behind Android's navigation buttons. */}
      <GradientFill
        kind="linear"
        stops={[
          { offset: 0, color: themeColors.background, opacity: 0 },
          { offset: 0.5, color: themeColors.background, opacity: 0.75 },
          { offset: 0.85, color: themeColors.background, opacity: 1 },
          { offset: 1, color: themeColors.background, opacity: 1 },
        ]}
      />
      <View
        accessibilityRole="tablist"
        className="flex-row items-center rounded-[28px] px-xs"
        style={{
          height: BAR_HEIGHT,
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
            selectionFeedback();
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
