import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { ScreenHeader } from '@/components/screen-header';
import { dayNumber, pickOutfit } from '@/features/today';
import { ADD_GARMENT_HREF, GarmentThumb, useGarmentsQuery, useLaundry } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';

import { useCalendar } from '../calendar-store';
import { DayStrip, type StripDay } from '../components/day-strip';
import { OutfitPickerSheet } from '../components/outfit-picker-sheet';

const LONG_DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const DAYS_AHEAD = 14;

function dayTitle(index: number, date: Date): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return LONG_DAY.format(date);
}

/**
 * Plan what to wear for the next two weeks. A strip of days at the top; the
 * selected day's outfit below, which the user chooses piece by piece in a
 * sheet over the wardrobe, or lets the app suggest. Plans stay on the phone.
 */
export function CalendarScreen() {
  // Rebuilt each render, so it moves on past midnight; by calendar date, so a
  // daylight-saving change never repeats or skips a day.
  const now = new Date();
  const days: StripDay[] = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { day: dayNumber(date), date };
  });
  const [chosen, setSelected] = useState<number | null>(null);
  // A chosen day that has since passed falls back to today.
  const selected = days.some((d) => d.day === chosen) ? (chosen as number) : days[0].day;
  const [picking, setPicking] = useState(false);
  // The pieces ticked in the sheet, until Save.
  const [draft, setDraft] = useState<string[]>([]);

  const garments = useGarmentsQuery().data ?? [];
  const inWash = useLaundry((state) => state.garmentIds);
  const { plans, plan, clear } = useCalendar();
  const byId = new Map(garments.map((g) => [g.id, g]));
  const available = garments.filter((g) => !inWash.includes(g.id));

  const index = days.findIndex((d) => d.day === selected);
  const title = dayTitle(index, days[index].date);
  // Pieces deleted since the plan was made just drop out.
  const outfit = (plans[selected] ?? []).flatMap((id) => byId.get(id) ?? []);

  // Each opening starts from the day's current outfit.
  const openPicker = () => {
    setDraft(outfit.map((g) => g.id));
    setPicking(true);
  };

  return (
    <View className="flex-1 bg-background">
      <AppScaffold back>
        <ScreenHeader
          eyebrow="Next two weeks"
          title="Plan your outfits"
          subtitle="Pick a day, then choose what you’ll wear. Plans stay on this phone."
        />

        <DayStrip
          days={days}
          selected={selected}
          planned={(day) => (plans[day]?.length ?? 0) > 0}
          onSelect={setSelected}
        />

        <View className="mt-xl rounded-[24px] border border-border bg-surface p-lg">
          <Text className="font-mono-semibold text-[11px] uppercase tracking-[1.2px] text-neutral-500">
            {outfit.length ? 'Planned outfit' : 'Nothing planned yet'}
          </Text>
          <Text
            className="mt-xxs font-display text-[26px] text-ink-primary"
            accessibilityRole="header"
          >
            {title}
          </Text>

          {garments.length === 0 ? (
            <>
              <Text className="mt-md font-sans text-[13.5px] leading-[20px] text-ink-secondary">
                Add a few pieces to your wardrobe first, then plan your days with them.
              </Text>
              <View className="mt-lg">
                <AppButton label="Add a piece" onPress={() => router.push(ADD_GARMENT_HREF)} />
              </View>
            </>
          ) : outfit.length ? (
            <>
              <View className="mt-lg flex-row flex-wrap gap-md">
                {outfit.map((g) => (
                  <View key={g.id} className="w-[88px]">
                    <GarmentThumb garment={g} size={88} />
                    <Text
                      numberOfLines={1}
                      className="mt-xs font-sans text-[11.5px] text-ink-secondary"
                    >
                      {g.title}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="mt-lg">
                <AppButton label="Change pieces" variant="secondary" onPress={openPicker} />
              </View>
              <Pressable
                onPress={() => {
                  selectionFeedback();
                  clear(selected);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Clear the outfit for ${title}`}
                className="mt-sm items-center py-sm"
              >
                <Text className="font-sans-bold text-[13px] text-ink-secondary">
                  Clear this day
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="mt-md font-sans text-[13.5px] leading-[20px] text-ink-secondary">
                {available.length
                  ? 'Choose the pieces you’ll wear, or let us put an outfit together from your wardrobe.'
                  : 'Everything is in the laundry. Take pieces out of the wash to plan with them.'}
              </Text>
              <View className="mt-lg">
                <AppButton
                  label="Choose pieces"
                  onPress={openPicker}
                  disabled={available.length === 0}
                />
              </View>
              <View className="mt-sm">
                <AppButton
                  label="Suggest one for me"
                  variant="secondary"
                  icon="auto_awesome"
                  disabled={available.length === 0}
                  onPress={() => {
                    selectionFeedback();
                    plan(
                      selected,
                      pickOutfit(available, selected).map((g) => g.id),
                    );
                  }}
                />
              </View>
            </>
          )}
        </View>
      </AppScaffold>

      <OutfitPickerSheet
        open={picking}
        title={title}
        garments={garments}
        inWash={inWash}
        picked={draft}
        onChange={setDraft}
        onSave={(ids) => plan(selected, ids)}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}
