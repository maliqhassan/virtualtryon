import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';
import type { Garment } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/media-url';

import { useCalendar } from '../calendar-store';
import { dayNumber } from '../lib/pick-outfit';
import { piecesLabel, planPieces } from '../lib/plans';
import { CALENDAR_HREF, calendarDayHref } from '../routes';

const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' });
const DAYS = 6;

function Piece({ garment }: { garment: Garment }) {
  return (
    <View className="flex-1 overflow-hidden rounded-[10px] bg-muted">
      <Image
        source={{ uri: resolveMediaUrl(garment.imageUrl) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel=""
      />
    </View>
  );
}

/** Up to three pieces: the first large on the left, the others stacked beside it. */
function MiniMosaic({ pieces }: { pieces: Garment[] }) {
  const [first, ...rest] = pieces;
  return (
    <View className="h-[104px] flex-row gap-[4px]">
      <View style={{ flex: rest.length ? 1.3 : 1 }} className="flex-row">
        <Piece garment={first} />
      </View>
      {rest.length > 0 && (
        <View className="flex-1 gap-[4px]">
          {rest.slice(0, 2).map((g) => (
            <Piece key={g.id} garment={g} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * "This week" on Home: the six days after today, each showing the outfit
 * planned in the calendar, or an invitation to plan one. Tapping a day opens
 * the calendar on it.
 */
export function WeekAhead({ garments }: { garments: Garment[] }) {
  const plans = useCalendar((state) => state.plans);
  const now = new Date();
  // By calendar date, so a daylight-saving change never repeats or skips a day.
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
    const day = dayNumber(date);
    return { date, day, pieces: planPieces(plans[day], garments) };
  });
  const plannedCount = days.filter((d) => d.pieces.length).length;

  return (
    <View className="mt-xxl">
      <View className="flex-row items-baseline justify-between">
        <View>
          <Text className="font-sans-bold text-[17px] text-ink-primary" accessibilityRole="header">
            This week
          </Text>
          <Text className="mt-xxs font-sans text-[12px] text-ink-secondary">
            {plannedCount
              ? `${plannedCount} of ${DAYS} days planned`
              : 'Plan ahead and mornings take care of themselves'}
          </Text>
        </View>
        <Pressable onPress={() => router.push(CALENDAR_HREF)} accessibilityRole="link" hitSlop={8}>
          <Text className="font-sans-bold text-[12px] text-primary">Calendar</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-xl mt-md"
        contentContainerClassName="gap-[9px] px-xl pb-xs"
      >
        {days.map(({ date, day, pieces }) => {
          const label = SHORT_DAY.format(date);
          const planned = pieces.length > 0;
          return (
            <Pressable
              key={day}
              onPress={() => {
                selectionFeedback();
                router.push(calendarDayHref(day));
              }}
              accessibilityRole="button"
              accessibilityLabel={
                planned
                  ? `${label}: ${piecesLabel(pieces.length)} planned`
                  : `${label}: nothing planned. Plan an outfit`
              }
              className="w-[120px] rounded-[20px] border border-border bg-surface p-[8px]"
            >
              {planned ? (
                <MiniMosaic pieces={pieces} />
              ) : (
                <View className="h-[104px] items-center justify-center gap-xxs rounded-[12px] border-[1.5px] border-dashed border-neutral-300">
                  <AppIcon name="add" size={22} color={themeColors.neutral500} />
                  <Text className="font-sans-semibold text-[11.5px] text-neutral-500">Plan</Text>
                </View>
              )}
              <View className="mx-xxs mt-sm flex-row items-center justify-between">
                <Text className="font-mono-semibold text-[11px] uppercase text-ink-primary">
                  {label}
                </Text>
                {planned && <View className="h-[6px] w-[6px] rounded-full bg-primary" />}
              </View>
              <Text className="mx-xxs mb-xxs mt-[1px] font-sans text-[11.5px] text-ink-secondary">
                {planned ? piecesLabel(pieces.length) : 'Nothing yet'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
