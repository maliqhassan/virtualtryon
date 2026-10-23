import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppImage } from '@/components/app-image';
import { PressableScale } from '@/components/pressable-scale';
import { resolveMediaUrl } from '@/lib/media-url';

import { garmentDetailsHref } from '../routes';
import type { Garment } from '../types';

type GarmentCardProps = {
  garment: Garment;
};

export function GarmentCard({ garment }: GarmentCardProps) {
  return (
    <PressableScale
      onPress={() => router.push(garmentDetailsHref(garment.id))}
      containerClassName="mb-md flex-1"
      className="flex-1 overflow-hidden rounded-xxl border border-border bg-surface"
      accessibilityRole="button"
      accessibilityLabel={`Open garment ${garment.title}`}
    >
      <AppImage
        uri={resolveMediaUrl(garment.imageUrl)}
        accessibilityLabel={garment.title}
        aspectRatio={3 / 4}
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
    </PressableScale>
  );
}
