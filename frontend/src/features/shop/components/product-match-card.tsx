import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { MatchBadge } from '@/components/match-badge';
import { PressableScale } from '@/components/pressable-scale';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/media-url';

import { MATCH_SCORES_ENABLED } from '../flags';
import { formatPrice } from '../format';
import type { Product } from '../types';
import { useWishlist } from '../wishlist-store';

/**
 * Horizontal product card: image, store overline, name, a one-line reason,
 * price, and (once the server sends them) the match badge and colour · fit
 * grades.
 */
export function ProductMatchCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const saved = useWishlist((state) => state.productIds.includes(product.id));
  const toggle = useWishlist((state) => state.toggle);
  const match = MATCH_SCORES_ENABLED ? product.match : undefined;
  const price = formatPrice(product.priceCents, product.currency);

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${product.title} from ${product.storeName}, ${price}`}
      containerClassName="mb-[11px]"
      className="flex-row gap-[13px] rounded-[22px] border border-[rgba(22,19,15,0.07)] bg-surface p-[10px]"
    >
      <View
        className="w-[104px] overflow-hidden rounded-[15px] bg-muted"
        style={{ minHeight: 132 }}
      >
        <Image
          source={{ uri: resolveMediaUrl(product.imageUrl) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={product.title}
        />
        {match && (
          <View className="absolute left-sm top-sm">
            <MatchBadge score={match.score} />
          </View>
        )}
      </View>
      <View className="min-w-0 flex-1 px-xxs py-xs">
        <View className="flex-row justify-between gap-[6px]">
          <Text
            numberOfLines={1}
            className="flex-1 font-mono text-[9.5px] uppercase tracking-[1.2px] text-neutral-400"
          >
            {product.storeName}
          </Text>
          <Pressable
            onPress={() => {
              selectionFeedback();
              toggle(product.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            accessibilityState={{ selected: saved }}
            hitSlop={10}
          >
            <AppIcon
              name={saved ? 'bookmark_added' : 'bookmark_border'}
              size={19}
              color={saved ? themeColors.primary : themeColors.neutral400}
            />
          </Pressable>
        </View>
        <Text
          numberOfLines={2}
          className="mt-[3px] font-sans-bold text-[14px] leading-[18px] text-ink-primary"
        >
          {product.title}
        </Text>
        <Text
          numberOfLines={2}
          className="mt-[6px] font-sans text-[11.5px] leading-[17px] text-ink-secondary"
        >
          {match?.reason ?? `${product.category} · try it on your photo before you buy.`}
        </Text>
        <View className="mt-[9px] flex-row items-center justify-between">
          <Text className="font-sans-bold text-[14.5px] text-ink-primary">{price}</Text>
          {match && (
            <Text className="rounded-full bg-muted px-[7px] py-xs font-mono-semibold text-[9.5px] text-ink-secondary">
              colour {match.colour} · fit {match.fit}
            </Text>
          )}
        </View>
      </View>
    </PressableScale>
  );
}
