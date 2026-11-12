import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FadeInView } from '@/components/fade-in-view';
import { ThinkingIndicator } from '@/components/thinking-indicator';

import { useGarmentsQuery } from '../hooks/use-garments-query';
import { ADD_GARMENT_HREF } from '../routes';
import type { Garment } from '../types';

import { GarmentCard } from './garment-card';

/**
 * Wardrobe's Clothes tab: category chips (only those the user owns, with
 * counts) over a two-column grid. What the Wardrobe screen used to be
 * before it gained tabs (handoff v2.1 change 7). Fills its parent.
 */
export function ClothesTab() {
  const garmentsQuery = useGarmentsQuery();
  const [category, setCategory] = useState<string | null>(null);
  const all = useMemo(() => garmentsQuery.data ?? [], [garmentsQuery.data]);
  // Only categories the user actually owns, each with its count.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of all) map.set(g.category, (map.get(g.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [all]);

  if (garmentsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ThinkingIndicator step="Loading your wardrobe…" />
      </View>
    );
  }

  if (garmentsQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-md">
        <Text className="font-sans-semibold text-lg text-ink-primary">
          Couldn&rsquo;t load your wardrobe
        </Text>
        <Text className="text-center font-sans text-sm text-ink-secondary">
          Check your connection and try again.
        </Text>
        <AppButton label="Retry" variant="secondary" onPress={() => garmentsQuery.refetch()} />
      </View>
    );
  }

  if (all.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-md">
        <Text className="font-display text-3xl text-ink-primary">Your wardrobe is empty</Text>
        <Text className="text-center font-sans text-sm text-ink-secondary">
          Photograph the clothes you own to try them on any time.
        </Text>
        <AppButton
          label="Add your first piece"
          variant="primary"
          onPress={() => router.push(ADD_GARMENT_HREF)}
        />
      </View>
    );
  }

  const garments = category ? all.filter((g) => g.category === category) : all;

  return (
    <View className="flex-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-md flex-grow-0"
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {[[null, all.length] as const, ...counts].map(([name, count]) => {
          const active = category === name;
          return (
            <Pressable
              key={name ?? 'all'}
              onPress={() => setCategory(name)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={[
                'flex-row items-center gap-xs rounded-full px-lg py-sm',
                active ? 'bg-inverse' : 'border border-border bg-surface',
              ].join(' ')}
            >
              <Text
                className={
                  active
                    ? 'font-sans-semibold text-sm text-white'
                    : 'font-sans-semibold text-sm text-ink-primary'
                }
              >
                {name ?? 'All'}
              </Text>
              <Text
                className={
                  active
                    ? 'font-sans text-xs text-neutral-300'
                    : 'font-sans text-xs text-ink-secondary'
                }
              >
                {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        // An odd count gets an empty spacer so the last card keeps its
        // half width instead of stretching across the row.
        data={garments.length % 2 === 0 ? garments : [...garments, null]}
        keyExtractor={(garment: Garment | null) => garment?.id ?? 'spacer'}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) =>
          item ? (
            <FadeInView index={index} className="flex-1">
              <GarmentCard garment={item} />
            </FadeInView>
          ) : (
            <View className="flex-1" />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={garmentsQuery.isRefetching}
            onRefresh={() => garmentsQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
