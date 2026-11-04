import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView } from '@/components/fade-in-view';
import { IconButton } from '@/components/icon-button';
import { Skeleton } from '@/components/skeleton';
import { resolveMediaUrl } from '@/lib/media-url';

import { formatPrice } from '../format';
import { useProductsQuery } from '../hooks/use-catalog';
import { productHref } from '../routes';
import type { Product } from '../types';

const PAGE = '#1A1206';
const TEXT = '#F4EBD9';

function LookTile({ product, index }: { product: Product; index: number }) {
  return (
    <FadeInView index={index}>
      <Pressable
        onPress={() => router.push(productHref(product.id))}
        accessibilityRole="button"
        accessibilityLabel={`${product.title} from ${product.storeName}`}
      >
        <View className="aspect-[3/4] overflow-hidden rounded-[18px] bg-[#2E2210]">
          <Image
            source={{ uri: resolveMediaUrl(product.imageUrl) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={product.title}
          />
        </View>
        <Text className="mt-sm font-mono text-[9px] uppercase tracking-[1.3px] text-gold-overline">
          {product.storeName}
        </Text>
        <Text className="mt-xxs font-display text-[18px] leading-[20px]" style={{ color: TEXT }}>
          {product.title}
        </Text>
        <Text className="mt-xxs font-sans text-[11.5px] text-[#B9AE97]">
          {formatPrice(product.priceCents, product.currency)}
        </Text>
      </Pressable>
    </FadeInView>
  );
}

/**
 * The editorial lookbook: a curated page of pieces from the stores in the
 * app, in two columns (the second offset 30px for rhythm). Each opens its
 * product, where it can be tried on.
 */
export function LookbookScreen() {
  const productsQuery = useProductsQuery(null, '');
  const products = (productsQuery.data ?? []).slice(0, 12);
  const left = products.filter((_, i) => i % 2 === 0);
  const right = products.filter((_, i) => i % 2 === 1);

  return (
    <View className="flex-1" style={{ backgroundColor: PAGE }}>
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerClassName="px-xl pb-huge pt-lg"
          showsVerticalScrollIndicator={false}
        >
          <IconButton
            icon="arrow_back"
            tone="glass"
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <Text className="mt-xl font-mono text-[9.5px] tracking-[1.7px] text-gold-soft">
            EID EDIT · {products.length} PIECES
          </Text>
          <Text
            className="mt-sm font-display text-[40px] leading-[41px]"
            style={{ color: TEXT }}
            accessibilityRole="header"
          >
            Gold hour,{'\n'}
            <Text className="font-display-italic text-gold-soft">softly worn.</Text>
          </Text>
          <Text className="mt-md font-sans text-[13px] leading-[20px] text-[#B9AE97]">
            Pieces from the stores in the app, picked for the season. Tap one to see it on you.
          </Text>

          {productsQuery.isLoading ? (
            <View className="mt-xl flex-row gap-md">
              <View className="flex-1">
                <Skeleton aspectRatio={3 / 4} radius={18} dark />
              </View>
              <View className="flex-1 pt-[30px]">
                <Skeleton aspectRatio={3 / 4} radius={18} dark />
              </View>
            </View>
          ) : (
            <View className="mt-xl flex-row gap-md">
              <View className="flex-1 gap-xl">
                {left.map((p, i) => (
                  <LookTile key={p.id} product={p} index={i * 2} />
                ))}
              </View>
              <View className="flex-1 gap-xl pt-[30px]">
                {right.map((p, i) => (
                  <LookTile key={p.id} product={p} index={i * 2 + 1} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
