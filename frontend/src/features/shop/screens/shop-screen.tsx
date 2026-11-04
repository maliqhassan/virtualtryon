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
import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { IconButton } from '@/components/icon-button';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { themeColors } from '@/constants/theme';
import { useGarmentsQuery } from '@/features/wardrobe';

import { PasteLinkCard } from '../components/paste-link-card';
import { LookbookBanner } from '../components/lookbook-banner';
import { ProductMatchCard } from '../components/product-match-card';
import { StoreCard } from '../components/store-card';
import { useDebouncedValue, useProductsQuery, useStoresQuery } from '../hooks/use-catalog';
import { groupByStore } from '../lib/group-by-store';
import { WISHLIST_HREF, myStoreHref, productHref } from '../routes';

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
        'mr-[7px] rounded-full px-[15px] py-[9px]',
        selected ? 'bg-inverse' : 'border border-border bg-surface',
      ].join(' ')}
    >
      <Text
        className={
          selected
            ? 'font-sans-semibold text-[12.5px] text-white'
            : 'font-sans-semibold text-[12.5px] text-ink-primary'
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
  const garmentsQuery = useGarmentsQuery();
  const myStores = useMemo(() => groupByStore(garmentsQuery.data ?? []), [garmentsQuery.data]);

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

  const selectStore = (id: string | null) => {
    setStoreId(id);
    setCategory(ALL);
  };

  const header = (
    <View>
      <ScreenHeader
        eyebrow="Any store · try before you buy"
        title="Shop"
        right={
          <IconButton
            icon="bookmark"
            accessibilityLabel="Wishlist"
            onPress={() => router.push(WISHLIST_HREF)}
          />
        }
      />

      <PasteLinkCard />
      <LookbookBanner />

      {myStores.length > 0 && (
        <View className="mb-xl">
          <Text className="mb-sm font-mono text-[10px] uppercase tracking-[1.6px] text-ink-secondary">
            Your stores
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 8 }}
          >
            {myStores.map((store) => (
              <StoreCard
                key={store.host}
                name={store.name}
                subtitle={`${store.garments.length} ${store.garments.length === 1 ? 'piece' : 'pieces'}`}
                accentColor={store.accentColor}
                selected={false}
                onPress={() => router.push(myStoreHref(store.host))}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <Text className="mb-sm font-mono text-[10px] uppercase tracking-[1.6px] text-ink-secondary">
        Sample stores
      </Text>

      <View className="mb-lg flex-row items-center rounded-full border border-border bg-surface px-lg">
        <AppIcon name="search" size="sm" color={themeColors.neutral400} />
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
            <AppIcon name="close" size="sm" color={themeColors.inkSecondary} />
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
          <Text className="text-center font-sans text-sm text-ink-secondary">
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
        data={productsQuery.isLoading ? [] : visible}
        keyExtractor={(item) => item.id}
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
            <View className="gap-[11px]">
              <Skeleton height={152} radius={22} />
              <Skeleton height={152} radius={22} />
            </View>
          ) : (
            <Text className="mt-xl text-center font-sans text-sm text-ink-secondary">
              {search ? `Nothing matches “${search}”.` : 'No stores are connected yet.'}
            </Text>
          )
        }
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <ProductMatchCard product={item} onPress={() => router.push(productHref(item.id))} />
          </FadeInView>
        )}
      />
    </AppScaffold>
  );
}
