import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppScaffold } from '@/components/app-scaffold';
import { ListSectionLabel } from '@/components/list-card';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';

import { GarmentThumb } from '../components/garment-thumb';
import { useGarmentsQuery } from '../hooks/use-garments-query';
import { useLaundry } from '../laundry-store';
import { garmentDetailsHref } from '../routes';

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 rounded-[18px] border border-[rgba(22,19,15,0.07)] bg-surface p-[13px]">
      <Text className="font-display text-[26px] leading-[27px] text-ink-primary">{value}</Text>
      <Text className="mt-[5px] font-mono text-[9.5px] uppercase text-neutral-500">{label}</Text>
    </View>
  );
}

/**
 * Wardrobe stats from what the app knows: counts, the category balance and
 * the newest pieces. Wear counts and cost per wear need wear tracking on
 * the server, which doesn't exist yet.
 */
export function StatsScreen() {
  const garments = useGarmentsQuery().data ?? [];
  const inWash = useLaundry((state) => state.garmentIds.length);
  const fromStores = garments.filter((g) => g.sourceUrl).length;
  // Read the clock once per visit; render stays pure.
  const [monthAgo] = useState(() => Date.now() - 30 * 86_400_000);
  const recent = garments.filter((g) => Date.parse(g.createdAt) > monthAgo).length;

  const byCategory = Object.entries(
    garments.reduce<Record<string, number>>((acc, g) => {
      acc[g.category] = (acc[g.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const largest = byCategory[0]?.[1] ?? 1;

  return (
    <AppScaffold back>
      <ScreenHeader eyebrow="Your wardrobe" title="Wardrobe stats" />
      <View className="flex-row gap-[9px]">
        <Tile value={garments.length} label="pieces" />
        <Tile value={fromStores} label="from stores" />
        <Tile value={recent} label="added · 30 days" />
      </View>

      <ListSectionLabel>Category balance</ListSectionLabel>
      {byCategory.length === 0 ? (
        <Text className="font-sans text-[13px] text-ink-secondary">No pieces yet.</Text>
      ) : (
        <View className="gap-md rounded-[22px] border border-[rgba(22,19,15,0.07)] bg-surface p-lg">
          {byCategory.map(([category, count]) => (
            <View key={category}>
              <View className="flex-row justify-between">
                <Text className="font-sans-semibold text-[13px] text-ink-primary">{category}</Text>
                <Text className="font-mono text-[10.5px] text-neutral-500">{count}</Text>
              </View>
              <View className="mt-xs h-[6px] rounded-full bg-muted">
                <View
                  className="h-[6px] rounded-full bg-primary"
                  style={{ width: `${(count / largest) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {garments.length > 0 && (
        <>
          <ListSectionLabel>Newest pieces</ListSectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-sm"
          >
            {garments.slice(0, 8).map((g) => (
              <PressableScale
                key={g.id}
                onPress={() => router.push(garmentDetailsHref(g.id))}
                accessibilityRole="button"
                accessibilityLabel={g.title}
              >
                <GarmentThumb garment={g} size={76} />
              </PressableScale>
            ))}
          </ScrollView>
        </>
      )}

      <Text className="mt-xl font-sans text-[11.5px] leading-[17px] text-ink-secondary">
        {inWash > 0 ? `${inWash} in the laundry right now. ` : ''}Wear counts and cost per wear
        arrive once the app tracks what you wear.
      </Text>
    </AppScaffold>
  );
}
