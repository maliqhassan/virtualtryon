import { type Href, router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { GradientFill } from '@/components/gradient-fill';
import { PressableScale } from '@/components/pressable-scale';
import type { GoalId } from '@/features/onboarding';

import { CALENDAR_HREF, CHAT_HREF, GENERATE_HREF, RATE_HREF } from '../routes';

type Action = {
  id: string;
  title: string;
  caption: string;
  href: Href;
  icon?: { name: string; color: string; tint: string };
  /** Onboarding goals that move this action to the front. */
  goals: GoalId[];
};

const ACTIONS: Action[] = [
  {
    id: 'rate',
    title: 'Rate my fit',
    caption: 'Selfie → score',
    href: RATE_HREF,
    icon: { name: 'photo_camera', color: '#B4713F', tint: '#F3E6DB' },
    goals: ['bold', 'style'],
  },
  {
    id: 'chat',
    title: 'Ask Noor',
    caption: '“Mehndi on Friday”',
    href: CHAT_HREF,
    goals: ['style', 'inspiration'],
  },
  {
    id: 'generate',
    title: 'Style an occasion',
    caption: 'Office · Eid · Travel',
    href: GENERATE_HREF,
    icon: { name: 'style', color: '#4A5578', tint: '#E7E9F0' },
    goals: ['events', 'wardrobe'],
  },
  {
    id: 'calendar',
    title: 'Plan the week',
    caption: 'Outfits for what’s ahead',
    href: CALENDAR_HREF,
    icon: { name: 'calendar_month', color: '#9A7418', tint: '#F5EBD3' },
    goals: ['events', 'wardrobe'],
  },
];

/** Actions matching the user's onboarding goals come first; ties keep the design's order. */
export function orderActions(goals: GoalId[]): Action[] {
  const score = (action: Action) => action.goals.filter((goal) => goals.includes(goal)).length;
  return [...ACTIONS].sort((a, b) => score(b) - score(a));
}

export function QuickActions({ goals }: { goals: GoalId[] }) {
  return (
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
          {action.icon ? (
            <View
              className="h-9 w-9 items-center justify-center rounded-md"
              style={{ backgroundColor: action.icon.tint }}
            >
              <AppIcon name={action.icon.name} size={19} color={action.icon.color} />
            </View>
          ) : (
            <View className="h-9 w-9 overflow-hidden rounded-full">
              <GradientFill
                kind="radial"
                center={{ x: 0.35, y: 0.3 }}
                radius={{ x: 0.75, y: 0.75 }}
                stops={[
                  { offset: 0, color: '#E7C77A' },
                  { offset: 1, color: '#B4713F' },
                ]}
              />
            </View>
          )}
          <Text className="mt-[10px] font-sans-bold text-[13.5px] text-ink-primary">
            {action.title}
          </Text>
          <Text className="mt-xxs font-sans text-[11.5px] text-ink-secondary">
            {action.caption}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}
