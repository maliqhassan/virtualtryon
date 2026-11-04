import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { ScreenHeader } from '@/components/screen-header';
import { themeColors } from '@/constants/theme';
import { dayNumber, pickOutfit } from '@/features/today';
import { GarmentThumb, useGarmentsQuery, useLaundry } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';

import { useCalendar } from '../calendar-store';

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const DAYS_AHEAD = 14;

/**
 * The next two weeks. A planned day shows its locked outfit; an unplanned
 * one a dashed "Plan an outfit", which picks one from the user's pieces.
 */
export function CalendarScreen() {
  const [start] = useState(() => Date.now());
  const garments = useGarmentsQuery().data ?? [];
  const inWash = useLaundry((state) => state.garmentIds);
  const { plans, plan, clear } = useCalendar();
  const available = garments.filter((g) => !inWash.includes(g.id));
  const byId = new Map(garments.map((g) => [g.id, g]));

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(start + i * 86_400_000));

  return (
    <AppScaffold back>
      <ScreenHeader
        eyebrow="Next two weeks"
        title="Plan the week"
        subtitle="Lock an outfit for a day. Plans stay on this phone."
      />
      <View className="gap-sm">
        {days.map((date, index) => {
          const day = dayNumber(date);
          const planned = (plans[day] ?? []).flatMap((id) => byId.get(id) ?? []);
          const label = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : DAY.format(date);
          return planned.length ? (
            <View key={day} className="flex-row items-center gap-md rounded-[18px] bg-inverse p-sm">
              <Text className="w-[64px] font-mono-semibold text-[10px] uppercase text-gold-overline">
                {label}
              </Text>
              <View className="flex-1 flex-row gap-xs">
                {planned.map((g) => (
                  <GarmentThumb key={g.id} garment={g} size={44} />
                ))}
              </View>
              <Pressable
                onPress={() => clear(day)}
                accessibilityRole="button"
                accessibilityLabel={`Clear the plan for ${label}`}
                hitSlop={8}
              >
                <AppIcon name="close" size="sm" color={themeColors.nightBody} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              key={day}
              onPress={() => {
                selectionFeedback();
                plan(
                  day,
                  pickOutfit(available, day).map((g) => g.id),
                );
              }}
              disabled={available.length === 0}
              accessibilityRole="button"
              accessibilityLabel={`Plan an outfit for ${label}`}
              className="flex-row items-center gap-md rounded-[18px] p-md"
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: 'rgba(22, 19, 15, 0.16)',
              }}
            >
              <Text className="w-[64px] font-mono-semibold text-[10px] uppercase text-neutral-500">
                {label}
              </Text>
              <Text className="flex-1 font-sans-semibold text-[13px] text-ink-secondary">
                {available.length ? 'Plan an outfit' : 'Add pieces to plan outfits'}
              </Text>
              <AppIcon name="add" size="sm" color={themeColors.neutral400} />
            </Pressable>
          );
        })}
      </View>
    </AppScaffold>
  );
}
