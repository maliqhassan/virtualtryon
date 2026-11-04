import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppScaffold } from '@/components/app-scaffold';
import { ListSectionLabel } from '@/components/list-card';
import { ScreenHeader } from '@/components/screen-header';
import { selectionFeedback } from '@/lib/haptics';

import { GarmentThumb } from '../components/garment-thumb';
import { useGarmentsQuery } from '../hooks/use-garments-query';
import { useLaundry } from '../laundry-store';
import { buildCapsule } from '../lib/capsule';

const TRIP_LENGTHS = [3, 5, 7, 10];

/** A small capsule from the user's own clothes, assigned day by day. */
export function PackingScreen() {
  const [days, setDays] = useState(5);
  const inWash = useLaundry((state) => state.garmentIds);
  const garments = (useGarmentsQuery().data ?? []).filter((g) => !inWash.includes(g.id));
  const { pieces, outfits } = buildCapsule(garments, days);

  return (
    <AppScaffold back>
      <ScreenHeader
        eyebrow="Packing planner"
        title={`${days}-day trip`}
        subtitle={
          pieces.length
            ? `${pieces.length} pieces that make ${outfits.length} outfits, from what you own.`
            : 'Add pieces to your wardrobe and a capsule appears here.'
        }
      />
      <View className="flex-row gap-[7px]" accessibilityRole="tablist">
        {TRIP_LENGTHS.map((length) => {
          const on = length === days;
          return (
            <Pressable
              key={length}
              onPress={() => {
                selectionFeedback();
                setDays(length);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className={`rounded-full px-[15px] py-[9px] ${on ? 'bg-inverse' : 'border border-border bg-surface'}`}
            >
              <Text
                className={`font-sans-semibold text-[12.5px] ${on ? 'text-white' : 'text-ink-primary'}`}
              >
                {length} days
              </Text>
            </Pressable>
          );
        })}
      </View>

      {pieces.length > 0 && (
        <>
          <ListSectionLabel>Pack these</ListSectionLabel>
          <View className="flex-row flex-wrap gap-sm">
            {pieces.map((g) => (
              <GarmentThumb key={g.id} garment={g} size={64} />
            ))}
          </View>

          <ListSectionLabel>Day by day</ListSectionLabel>
          <View className="gap-sm">
            {outfits.map((outfit, index) => (
              <View
                key={index}
                className="flex-row items-center gap-md rounded-[18px] border border-border bg-surface p-sm"
              >
                <Text className="w-[46px] font-mono-semibold text-[10.5px] text-neutral-500">
                  DAY {index + 1}
                </Text>
                <View className="flex-1 flex-row gap-xs">
                  {outfit.map((g) => (
                    <GarmentThumb key={g.id} garment={g} size={44} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </AppScaffold>
  );
}
