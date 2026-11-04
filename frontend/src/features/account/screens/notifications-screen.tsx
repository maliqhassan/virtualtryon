import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { ListSectionLabel } from '@/components/list-card';
import { ScreenHeader } from '@/components/screen-header';
import { themeColors } from '@/constants/theme';
import { useGarmentsQuery } from '@/features/wardrobe';

/**
 * Notifications. There's no push or notification history on the server
 * yet, so this lists what the app knows now (today's outfit) and says
 * what will arrive here, instead of showing invented alerts.
 */
export function NotificationsScreen() {
  const hasPieces = (useGarmentsQuery().data?.length ?? 0) > 0;

  return (
    <AppScaffold back>
      <ScreenHeader title="Notifications" />

      <ListSectionLabel>Today</ListSectionLabel>
      {hasPieces ? (
        <Pressable
          onPress={() => router.dismissTo('/')}
          accessibilityRole="button"
          className="flex-row gap-md rounded-[18px] bg-inverse p-[14px]"
        >
          <AppIcon name="wb_twilight" size="md" color={themeColors.goldSoft} />
          <View className="flex-1">
            <Text className="font-sans-bold text-[13px] text-cream">Today’s outfit is ready</Text>
            <Text className="mt-[3px] font-sans text-[12px] text-neutral-400">
              Picked from your wardrobe. Open Today to see it.
            </Text>
          </View>
        </Pressable>
      ) : (
        <View className="flex-row gap-md rounded-[18px] border border-border bg-surface p-[14px]">
          <AppIcon name="checkroom" size="md" color={themeColors.inkSecondary} />
          <View className="flex-1">
            <Text className="font-sans-bold text-[13px] text-ink-primary">Nothing yet</Text>
            <Text className="mt-[3px] font-sans text-[12px] text-ink-secondary">
              Add a few pieces and your daily outfit shows up here.
            </Text>
          </View>
        </View>
      )}

      <ListSectionLabel>Coming here</ListSectionLabel>
      <View className="gap-[9px] opacity-70">
        {[
          ['auto_awesome', 'Try-on ready', 'When a try-on finishes while you’re away.'],
          ['sell', 'Wishlist price drops', 'When something you saved gets cheaper.'],
        ].map(([icon, title, body]) => (
          <View
            key={title}
            className="flex-row gap-md rounded-[18px] border border-border bg-surface p-[14px]"
          >
            <AppIcon name={icon} size="md" color={themeColors.neutral500} />
            <View className="flex-1">
              <Text className="font-sans-bold text-[13px] text-ink-primary">{title}</Text>
              <Text className="mt-[3px] font-sans text-[12px] text-ink-secondary">{body}</Text>
            </View>
          </View>
        ))}
      </View>
    </AppScaffold>
  );
}
