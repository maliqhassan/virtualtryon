import { router } from 'expo-router';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { ThinkingIndicator } from '@/components/thinking-indicator';

import { GarmentCard } from '../components/garment-card';
import { useGarmentsQuery } from '../hooks/use-garments-query';
import { ADD_GARMENT_HREF } from '../routes';
import type { Garment } from '../types';

export function WardrobeScreen() {
  const garmentsQuery = useGarmentsQuery();

  if (garmentsQuery.isLoading) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading your wardrobe…" />
        </View>
      </AppScaffold>
    );
  }

  if (garmentsQuery.isError) {
    return (
      <AppScaffold scroll={false}>
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

  const garments = garmentsQuery.data ?? [];

  if (garments.length === 0) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="text-lg font-semibold text-ink-primary">Your wardrobe is empty</Text>
          <Text className="text-center text-sm text-ink-secondary">
            Add a garment to start building your wardrobe.
          </Text>
          <AppButton
            label="Add Garment"
            variant="primary"
            onPress={() => router.push(ADD_GARMENT_HREF)}
          />
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold scroll={false}>
      <View className="mb-md flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-ink-primary">Wardrobe</Text>
        <AppButton label="Add" variant="secondary" onPress={() => router.push(ADD_GARMENT_HREF)} />
      </View>
      <FlatList
        data={garments}
        keyExtractor={(garment: Garment) => garment.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => <GarmentCard garment={item} />}
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
