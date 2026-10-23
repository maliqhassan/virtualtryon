import * as Haptics from 'expo-haptics';
import type { Tabs } from 'expo-router';
import { useEffect, type ComponentProps, type ComponentType } from 'react';
import { type ColorValue, Platform, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { themeColors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { PressableScale } from './pressable-scale';
import { AccountIcon, LooksIcon, ShopIcon, TryOnIcon, WardrobeIcon } from './tab-icons';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type Icon = ComponentType<{ color: ColorValue; size?: number }>;

/** Left-to-right order in the bar. Try On ("index") is the raised centre button. */
const ORDER = ['wardrobe', 'shop', 'index', 'looks', 'account'] as const;
const CENTER = 'index';
const ICONS: Record<string, Icon> = {
  index: TryOnIcon,
  wardrobe: WardrobeIcon,
  shop: ShopIcon,
  looks: LooksIcon,
  account: AccountIcon,
};

const BAR_SHADOW = '0px 8px 24px rgba(22, 19, 15, 0.10)';

function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

function TabItem({
  label,
  icon: IconComponent,
  focused,
  onPress,
}: {
  label: string;
  icon: Icon;
  focused: boolean;
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

  const color = focused ? themeColors.primary : themeColors.neutral500;
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
      className="items-center justify-center py-sm"
    >
      <View className="items-center justify-center">
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 52,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(180, 113, 63, 0.12)',
            },
            highlight,
          ]}
        />
        <View className="h-8 items-center justify-center">
          <IconComponent color={color} size={22} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        className={
          focused
            ? 'mt-xxs text-[11px] font-bold text-primary'
            : 'mt-xxs text-[11px] font-semibold text-neutral-500'
        }
        style={{ lineHeight: 14 }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function CenterItem({
  label,
  focused,
  onPress,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <View className="items-center" style={{ flex: 1 }}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        pressedScale={0.9}
        containerClassName="-mt-xxxl"
        className="h-[62px] w-[62px] items-center justify-center rounded-full bg-inverse"
        style={{
          borderWidth: 5,
          borderColor: themeColors.background,
          boxShadow: '0px 6px 16px rgba(22, 19, 15, 0.25)',
        }}
      >
        <TryOnIcon color={focused ? '#C9A227' : '#F2EFEA'} size={26} />
      </PressableScale>
      <Text
        numberOfLines={1}
        className={
          focused
            ? 'mt-xxs text-[11px] font-bold text-primary'
            : 'mt-xxs text-[11px] font-semibold text-neutral-500'
        }
        style={{ lineHeight: 14 }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Floating pill tab bar with a raised Try On button.
 *
 * Android: since SDK 55 apps draw edge-to-edge, so the system navigation bar
 * sits on top of the app. `insets.bottom` is that bar's real height (gesture
 * pill, 3-button bar, or none), and the bar is lifted by exactly that much,
 * so it never overlaps the system buttons on any phone.
 */
export function FloatingTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const bottomGap = Math.max(insets.bottom, 12);

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
        backgroundColor: themeColors.background,
      }}
    >
      <View
        accessibilityRole="tablist"
        className="flex-row items-center rounded-[28px] border border-border bg-surface px-xs"
        style={{ height: 66, boxShadow: BAR_SHADOW }}
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
            <CenterItem key={route.key} label={label} focused={focused} onPress={onPress} />
          ) : (
            <TabItem
              key={route.key}
              label={label}
              icon={ICONS[route.name] ?? TryOnIcon}
              focused={focused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}
