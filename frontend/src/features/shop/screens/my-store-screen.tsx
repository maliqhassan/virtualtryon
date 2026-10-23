import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { type Garment, GarmentCard, useGarmentsQuery } from '@/features/wardrobe';
import { openExternalLink } from '@/lib/open-link';

import { groupByStore } from '../lib/group-by-store';
import { SHOP_HREF } from '../routes';

/** Everything the user has added from one store by pasting product links. */
export function MyStoreScreen() {
  const { host } = useLocalSearchParams<{ host: string }>();
  const garmentsQuery = useGarmentsQuery();
  const store = useMemo(
    () => groupByStore(garmentsQuery.data ?? []).find((s) => s.host === host) ?? null,
    [garmentsQuery.data, host],
  );

  if (garmentsQuery.isLoading) {
    return (
      <AppScaffold back>
        <Skeleton height={34} width="60%" radius={8} />
        <View className="mt-lg flex-row gap-md">
          <View className="flex-1">
            <Skeleton aspectRatio={3 / 4} radius={20} />
          </View>
          <View className="flex-1">
            <Skeleton aspectRatio={3 / 4} radius={20} />
          </View>
        </View>
      </AppScaffold>
    );
  }

  if (!store) {
    return (
      <AppScaffold back>
        <Text className="font-display text-3xl text-ink-primary">No pieces from this store</Text>
        <Text className="mt-xs text-ink-secondary">Paste a product link in Shop to add one.</Text>
        <View className="mt-lg">
          <AppButton label="Go to Shop" onPress={() => router.dismissTo(SHOP_HREF)} />
        </View>
      </AppScaffold>
    );
  }

  const count = store.garments.length;
  // An odd count gets an empty spacer so the last card keeps its half width.
  const gridData: (Garment | null)[] = count % 2 === 0 ? store.garments : [...store.garments, null];

  return (
    <AppScaffold back scroll={false}>
      <FlatList
        data={gridData}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="mb-lg">
            <ScreenHeader
              eyebrow="Your store"
              title={store.name}
              subtitle={`${count} ${count === 1 ? 'piece' : 'pieces'} you’ve added from ${store.host}`}
            />
            <AppButton
              label="Visit store"
              variant="secondary"
              onPress={() => openExternalLink(store.homeUrl)}
            />
          </View>
        }
        renderItem={({ item, index }) =>
          item ? (
            <FadeInView index={index} className="flex-1">
              <GarmentCard garment={item} />
            </FadeInView>
          ) : (
            <View className="flex-1" />
          )
        }
      />
    </AppScaffold>
  );
}
