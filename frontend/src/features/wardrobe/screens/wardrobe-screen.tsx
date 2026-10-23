import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { ScreenHeader } from '@/components/screen-header';
import { ThinkingIndicator } from '@/components/thinking-indicator';

import { GarmentCard } from '../components/garment-card';
import { useGarmentsQuery } from '../hooks/use-garments-query';
import { ADD_GARMENT_HREF } from '../routes';
import type { Garment } from '../types';

export function WardrobeScreen() {
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
      <AppScaffold inTabs scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading your wardrobe…" />
        </View>
      </AppScaffold>
    );
  }

  if (garmentsQuery.isError) {
    return (
      <AppScaffold inTabs scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="text-lg font-semibold text-ink-primary">
            Couldn&rsquo;t load your wardrobe
          </Text>
          <Text className="text-center text-sm text-ink-secondary">
            Check your connection and try again.
          </Text>
          <AppButton label="Retry" variant="secondary" onPress={() => garmentsQuery.refetch()} />
        </View>
      </AppScaffold>
    );
  }

  const garments = category ? all.filter((g) => g.category === category) : all;

  if (all.length === 0) {
    return (
      <AppScaffold inTabs scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="font-display text-3xl text-ink-primary">Your wardrobe is empty</Text>
          <Text className="text-center text-sm text-ink-secondary">
            Photograph the clothes you own to try them on any time.
          </Text>
          <AppButton
            label="Add your first piece"
            variant="primary"
            onPress={() => router.push(ADD_GARMENT_HREF)}
          />
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold inTabs scroll={false}>
      <ScreenHeader
        eyebrow={`${all.length} ${all.length === 1 ? 'piece' : 'pieces'} you own`}
        title="Wardrobe"
        right={
          <AppButton label="Add" variant="dark" onPress={() => router.push(ADD_GARMENT_HREF)} />
        }
      />
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
                    ? 'text-sm font-semibold text-white'
                    : 'text-sm font-semibold text-ink-primary'
                }
              >
                {name ?? 'All'}
              </Text>
              <Text className={active ? 'text-xs text-neutral-300' : 'text-xs text-ink-secondary'}>
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
    </AppScaffold>
  );
}
