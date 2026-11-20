import { Pressable, ScrollView, Text, View } from 'react-native';

import { selectionFeedback } from '@/lib/haptics';

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

export type StripDay = { day: number; date: Date };

/**
 * The days ahead as date chips (weekday over date). The selected one is
 * filled ink; a gold dot marks a day that already has an outfit.
 */
export function DayStrip({
  days,
  selected,
  planned,
  onSelect,
}: {
  days: StripDay[];
  selected: number;
  planned: (day: number) => boolean;
  onSelect: (day: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bleed to the screen edges, past the scaffold's padding.
      className="-mx-xl"
      contentContainerClassName="gap-sm px-xl"
      accessibilityRole="tablist"
    >
      {days.map(({ day, date }, index) => {
        const on = day === selected;
        const hasPlan = planned(day);
        const weekday = index === 0 ? 'Today' : WEEKDAY.format(date);
        return (
          <Pressable
            key={day}
            onPress={() => {
              selectionFeedback();
              onSelect(day);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${weekday} ${date.getDate()}${hasPlan ? ', outfit planned' : ''}`}
            className={`h-[74px] w-[56px] items-center justify-center rounded-[18px] ${
              on ? 'bg-inverse' : 'border border-border bg-surface'
            }`}
          >
            <Text
              className={`font-mono-semibold text-[11px] uppercase ${
                on ? 'text-gold-soft' : 'text-neutral-500'
              }`}
            >
              {weekday}
            </Text>
            <Text
              className={`mt-[2px] font-display text-[22px] ${on ? 'text-cream' : 'text-ink-primary'}`}
            >
              {date.getDate()}
            </Text>
            <View
              className={`mt-[3px] h-[5px] w-[5px] rounded-full ${
                hasPlan ? (on ? 'bg-gold-soft' : 'bg-primary') : 'bg-transparent'
              }`}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
