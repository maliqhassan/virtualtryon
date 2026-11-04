import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';

import { ProductMatchCard } from '../components/product-match-card';
import { useProductsQuery } from '../hooks/use-catalog';
import { SHOP_HREF, productHref } from '../routes';
import { useWishlist } from '../wishlist-store';

/** Products bookmarked in Shop, newest first. */
export function WishlistScreen() {
  const ids = useWishlist((state) => state.productIds);
  const productsQuery = useProductsQuery(null, '');
  const byId = new Map((productsQuery.data ?? []).map((p) => [p.id, p]));
  const saved = ids.flatMap((id) => byId.get(id) ?? []);

  return (
    <AppScaffold back>
      <ScreenHeader
        eyebrow={`${saved.length} saved`}
        title="Wishlist"
        subtitle="Pieces you bookmarked in Shop. Try one on before you decide."
      />
      {productsQuery.isLoading ? (
        <View className="gap-[11px]">
          <Skeleton height={152} radius={22} />
          <Skeleton height={152} radius={22} />
        </View>
      ) : saved.length === 0 ? (
        <View className="mt-xl items-center gap-md">
          <Text className="text-center font-sans text-[13px] text-ink-secondary">
            Tap the bookmark on any product in Shop to keep it here.
          </Text>
          <AppButton label="Go to Shop" onPress={() => router.navigate(SHOP_HREF)} />
        </View>
      ) : (
        saved.map((product, index) => (
          <FadeInView key={product.id} index={index}>
            <ProductMatchCard
              product={product}
              onPress={() => router.push(productHref(product.id))}
            />
          </FadeInView>
        ))
      )}
    </AppScaffold>
  );
}
