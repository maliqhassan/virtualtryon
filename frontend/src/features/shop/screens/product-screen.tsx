import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { Skeleton } from '@/components/skeleton';
import { MY_PHOTO_HREF, useMyPhotoQuery } from '@/features/my-photo';
import {
  MissingPhotoError,
  TryOnLimitReachedError,
  tryOnJobHref,
  useStartTryOn,
} from '@/features/tryon';
import { UPGRADE_HREF, UsagePill, useUsageQuery } from '@/features/usage';
import { resolveMediaUrl } from '@/lib/media-url';

import { formatPrice } from '../format';
import { useProductQuery } from '../hooks/use-catalog';

export function ProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const productQuery = useProductQuery(productId);
  const photoQuery = useMyPhotoQuery();
  const usageQuery = useUsageQuery();
  const startTryOn = useStartTryOn();

  const product = productQuery.data;
  const hasPhoto = !!photoQuery.data;
  const usage = usageQuery.data;
  const outOfTryOns = !!usage && usage.remaining <= 0;

  const handleTryOn = () => {
    if (!product) return;
    if (!hasPhoto) {
      router.push(MY_PHOTO_HREF);
      return;
    }
    startTryOn.mutate(
      { productId: product.id },
      {
        onSuccess: (job) => router.push(tryOnJobHref(job.id)),
        onError: (error) => {
          if (error instanceof TryOnLimitReachedError) router.push(UPGRADE_HREF);
          else if (error instanceof MissingPhotoError) router.push(MY_PHOTO_HREF);
        },
      },
    );
  };

  if (productQuery.isLoading) {
    return (
      <AppScaffold back>
        <Skeleton aspectRatio={3 / 4} radius={24} />
        <View className="mt-lg gap-sm">
          <Skeleton height={16} width="40%" radius={8} />
          <Skeleton height={34} width="80%" radius={8} />
        </View>
      </AppScaffold>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <AppScaffold back>
        <Text className="font-display text-3xl text-ink-primary">Product not found</Text>
        <Text className="mt-xs text-ink-secondary">It may no longer be available.</Text>
      </AppScaffold>
    );
  }

  const startError =
    startTryOn.error &&
    !(startTryOn.error instanceof TryOnLimitReachedError) &&
    !(startTryOn.error instanceof MissingPhotoError)
      ? startTryOn.error.message
      : null;

  return (
    <AppScaffold back>
      <FadeInView>
        <View className="overflow-hidden rounded-[24px] border border-border">
          <AppImage
            uri={resolveMediaUrl(product.imageUrl)}
            accessibilityLabel={product.title}
            aspectRatio={3 / 4}
            borderRadius={0}
          />
        </View>
      </FadeInView>

      <FadeInView index={1} className="mt-lg">
        <Text className="text-xs font-bold uppercase tracking-widest text-primary">
          {product.storeName}
        </Text>
        <Text className="mt-xs font-display text-[34px] leading-[38px] text-ink-primary">
          {product.title}
        </Text>
        <View className="mt-sm flex-row items-center justify-between">
          <Text className="text-xl font-bold text-ink-primary">
            {formatPrice(product.priceCents, product.currency)}
          </Text>
          <Text className="text-sm text-ink-secondary">{product.category}</Text>
        </View>
      </FadeInView>

      <FadeInView index={2} className="mt-xl gap-md">
        {usage && <UsagePill usage={usage} />}
        {outOfTryOns ? (
          <AppButton label="Get more try-ons" onPress={() => router.push(UPGRADE_HREF)} />
        ) : (
          <AppButton
            variant="dark"
            label={
              startTryOn.isPending
                ? 'Starting…'
                : hasPhoto
                  ? 'Try it on'
                  : 'Add your photo to try it on'
            }
            onPress={handleTryOn}
            disabled={startTryOn.isPending}
          />
        )}
        {startError && (
          <Text className="text-center text-sm text-error" accessibilityRole="alert">
            {startError}
          </Text>
        )}
        {product.productUrl ? (
          <AppButton
            label={`Buy at ${product.storeName}`}
            variant="secondary"
            onPress={() => Linking.openURL(product.productUrl as string)}
          />
        ) : (
          <Text className="text-center text-xs text-ink-secondary">
            This is a sample store, so buying isn’t available yet.
          </Text>
        )}
      </FadeInView>
    </AppScaffold>
  );
}
