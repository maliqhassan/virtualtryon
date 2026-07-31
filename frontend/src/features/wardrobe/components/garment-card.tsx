import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppImage } from '@/components/app-image';
import { resolveMediaUrl } from '@/lib/media-url';

import type { Garment } from '../types';

type GarmentCardProps = {
  garment: Garment;
};

export function GarmentCard({ garment }: GarmentCardProps) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/wardrobe/detail/[garmentId]', params: { garmentId: garment.id } })
      }
      className="mb-md flex-1 overflow-hidden rounded-xl border border-border bg-surface"
      accessibilityRole="button"
      accessibilityLabel={`Open garment ${garment.title}`}
    >
      <AppImage
        uri={resolveMediaUrl(garment.imageUrl)}
        accessibilityLabel={garment.title}
        aspectRatio={1}
        borderRadius={0}
      />
      <View className="p-sm">
        <Text className="text-sm font-semibold text-ink-primary" numberOfLines={1}>
          {garment.title}
        </Text>
        <Text className="text-xs text-ink-secondary" numberOfLines={1}>
          {garment.category}
        </Text>
      </View>
    </Pressable>
  );
}
