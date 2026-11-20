import { type Href, router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { BrandMark } from '@/components/brand-mark';
import { PressableScale } from '@/components/pressable-scale';
import { themeColors } from '@/constants/theme';
import type { GoalId } from '@/features/onboarding';
import { wardrobeTabHref } from '@/features/wardrobe';

import { CHAT_HREF, GENERATE_HREF, RATE_HREF } from '../routes';

type Action = {
  id: string;
  title: string;
  caption: string;
  href: Href;
  /** A Material icon on a tinted tile; without one, the brand mark on ink (Noor). */
  icon?: { name: string; color: string; tint: string };
  /** Onboarding goals that move this action to the front. */
  goals: GoalId[];
};

const ACTIONS: Action[] = [
  {
    id: 'chat',
    title: 'Ask Noor',
    caption: 'Ask what to wear',
    href: CHAT_HREF,
    goals: ['style', 'inspiration'],
  },
  {
    id: 'generate',
    title: 'Style an occasion',
    caption: 'Office, date, travel',
    href: GENERATE_HREF,
    icon: { name: 'style', color: '#4A5578', tint: '#E7E9F0' },
    goals: ['events', 'wardrobe'],
  },
  {
    id: 'rate',
    title: 'Rate my fit',
    caption: 'A selfie, then a score',
    href: RATE_HREF,
    icon: { name: 'photo_camera', color: themeColors.primary, tint: '#F3E6DB' },
    goals: ['bold', 'style'],
  },
  {
    id: 'looks',
    title: 'Saved looks',
    caption: 'Your try-ons, kept',
    href: wardrobeTabHref('outfits'),
    icon: { name: 'bookmark', color: '#9A7418', tint: '#F5EBD3' },
    goals: ['wardrobe', 'inspiration'],
  },
];

/** Actions matching the user's onboarding goals come first; ties keep the order above. */
export function orderActions(goals: GoalId[]): Action[] {
  const score = (action: Action) => action.goals.filter((goal) => goals.includes(goal)).length;
  return [...ACTIONS].sort((a, b) => score(b) - score(a));
}

/** Four shortcuts in a 2×2 grid, each an icon tile over a title and a hint. */
export function QuickActions({ goals }: { goals: GoalId[] }) {
  return (
    <View className="mt-xxl">
      <Text className="font-sans-bold text-[17px] text-ink-primary" accessibilityRole="header">
        Shortcuts
      </Text>
      <View className="mt-md flex-row flex-wrap justify-between gap-y-[10px]">
        {orderActions(goals).map((action) => (
          <PressableScale
            key={action.id}
            onPress={() => router.push(action.href)}
            pressedScale={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${action.title}. ${action.caption}`}
            containerStyle={{ width: '48.6%' }}
            className="rounded-xxl border border-border bg-surface p-[15px]"
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: action.icon?.tint ?? themeColors.inkPrimary }}
            >
              {action.icon ? (
                <AppIcon name={action.icon.name} size={20} color={action.icon.color} />
              ) : (
                <BrandMark width={21} />
              )}
            </View>
            <Text className="mt-md font-sans-bold text-[13.5px] text-ink-primary">
              {action.title}
            </Text>
            <Text numberOfLines={1} className="mt-xxs font-sans text-[11.5px] text-ink-secondary">
              {action.caption}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}
