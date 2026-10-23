import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ShopIcon } from '@/components/tab-icons';
import { themeColors } from '@/constants/theme';

import { PasteLinkCard } from '../components/paste-link-card';
import { ProductCard } from '../components/product-card';
import { StoreCard } from '../components/store-card';
import { useDebouncedValue, useProductsQuery, useStoresQuery } from '../hooks/use-catalog';
import { productHref } from '../routes';
import type { Product } from '../types';

const ALL = 'All';

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={[
        'mr-sm rounded-full px-lg py-sm',
        selected ? 'bg-inverse' : 'border border-border bg-surface',
      ].join(' ')}
    >
      <Text
        className={
          selected ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-ink-primary'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Try clothes from stores on before buying: paste a product link from any
 * store (PasteLinkCard), or browse the sample stores below it.
 */
export function ShopScreen() {
  const storesQuery = useStoresQuery();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [category, setCategory] = useState(ALL);
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim());
  const productsQuery = useProductsQuery(storeId, search);

  const stores = storesQuery.data ?? [];
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const totalProducts = stores.reduce((sum, store) => sum + store.productCount, 0);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );
  const visible = useMemo(
    () => (category === ALL ? products : products.filter((p) => p.category === category)),
    [products, category],
  );
  // An odd count gets an empty spacer so the last card keeps its half width.
  const gridData: (Product | null)[] = visible.length % 2 === 0 ? visible : [...visible, null];

  const selectStore = (id: string | null) => {
    setStoreId(id);
    setCategory(ALL);
  };

  const header = (
    <View>
      <ScreenHeader
        eyebrow="Any store"
        title="Shop"
        subtitle="Try clothes from stores on yourself before you buy them online."
      />

      <PasteLinkCard />

      <Text className="mb-sm text-xs font-bold uppercase tracking-widest text-ink-secondary">
        Sample stores
      </Text>

      <View className="mb-lg flex-row items-center rounded-full border border-border bg-surface px-lg">
        <ShopIcon color={themeColors.neutral500} size={18} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={
            storeId
              ? `Search ${stores.find((st) => st.id === storeId)?.name ?? 'this store'}`
              : 'Search shirts, dresses, stores…'
          }
          placeholderTextColor={themeColors.neutral500}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search clothes"
          className="ml-sm flex-1 py-md text-base text-ink-primary"
        />
        {searchText.length > 0 && (
          <Pressable
            onPress={() => setSearchText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
          >
            <Text className="text-lg text-ink-secondary">×</Text>
          </Pressable>
        )}
      </View>

      {storesQuery.isLoading ? (
        <View className="flex-row gap-md">
          <Skeleton width={150} height={112} radius={20} />
          <Skeleton width={150} height={112} radius={20} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingRight: 8 }}
        >
          <StoreCard
            name="All stores"
            subtitle={`${totalProducts} pieces`}
            accentColor="#16130F"
            selected={storeId === null}
            onPress={() => selectStore(null)}
          />
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              name={store.name}
              subtitle={store.tagline}
              accentColor={store.accentColor}
              selected={storeId === store.id}
              onPress={() => selectStore(store.id)}
            />
          ))}
        </ScrollView>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-lg mt-lg"
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {categories.map((c) => (
          <CategoryChip
            key={c}
            label={c}
            selected={c === category}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (storesQuery.isError || productsQuery.isError) {
    return (
      <AppScaffold inTabs scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="font-display text-3xl text-ink-primary">Couldn’t load stores</Text>
          <Text className="text-center text-sm text-ink-secondary">
            Check your connection and try again.
          </Text>
          <AppButton
            label="Retry"
            variant="secondary"
            onPress={() => {
              storesQuery.refetch();
              productsQuery.refetch();
            }}
          />
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold inTabs scroll={false}>
      <FlatList
        data={productsQuery.isLoading ? [] : gridData}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={productsQuery.isRefetching}
            onRefresh={() => {
              storesQuery.refetch();
              productsQuery.refetch();
            }}
          />
        }
        ListEmptyComponent={
          productsQuery.isLoading ? (
            <View className="flex-row gap-md">
              <View className="flex-1">
                <Skeleton aspectRatio={3 / 4} radius={20} />
              </View>
              <View className="flex-1">
                <Skeleton aspectRatio={3 / 4} radius={20} />
              </View>
            </View>
          ) : (
            <Text className="mt-xl text-center text-sm text-ink-secondary">
              {search ? `Nothing matches “${search}”.` : 'No stores are connected yet.'}
            </Text>
          )
        }
        renderItem={({ item, index }) =>
          item ? (
            <FadeInView index={index} className="flex-1">
              <ProductCard product={item} onPress={() => router.push(productHref(item.id))} />
            </FadeInView>
          ) : (
            <View className="flex-1" />
          )
        }
      />
    </AppScaffold>
  );
}
