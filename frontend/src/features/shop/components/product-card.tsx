import { Text, View } from 'react-native';

import { AppImage } from '@/components/app-image';
import { PressableScale } from '@/components/pressable-scale';
import { resolveMediaUrl } from '@/lib/media-url';

import { formatPrice } from '../format';
import type { Product } from '../types';

export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.title} from ${product.storeName}, ${formatPrice(product.priceCents, product.currency)}`}
      containerClassName="mb-md flex-1"
      className="flex-1 overflow-hidden rounded-xxl border border-border bg-surface"
    >
      <AppImage
        uri={resolveMediaUrl(product.imageUrl)}
        accessibilityLabel={product.title}
        aspectRatio={3 / 4}
        borderRadius={0}
      />
      <View className="p-md">
        <Text
          numberOfLines={1}
          className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary"
        >
          {product.storeName}
        </Text>
        <Text numberOfLines={1} className="mt-xxs text-sm font-semibold text-ink-primary">
          {product.title}
        </Text>
        <Text className="mt-xs text-sm font-bold text-primary">
          {formatPrice(product.priceCents, product.currency)}
        </Text>
      </View>
    </PressableScale>
  );
}
