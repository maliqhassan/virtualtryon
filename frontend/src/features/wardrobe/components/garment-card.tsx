import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppImage } from '@/components/app-image';
import { PressableScale } from '@/components/pressable-scale';
import { resolveMediaUrl } from '@/lib/media-url';

import { useLaundry } from '../laundry-store';
import { garmentDetailsHref } from '../routes';
import type { Garment } from '../types';

type GarmentCardProps = {
  garment: Garment;
};

/** A wardrobe piece: 4:5 photo inside an 8px card, name, and a tag. */
export function GarmentCard({ garment }: GarmentCardProps) {
  const inWash = useLaundry((state) => state.garmentIds.includes(garment.id));
  const tag = inWash ? 'in the wash' : garment.sourceUrl ? 'from a store' : null;
  return (
    <PressableScale
      onPress={() => router.push(garmentDetailsHref(garment.id))}
      containerClassName="mb-md flex-1"
      className="flex-1 rounded-[20px] border border-[rgba(22,19,15,0.07)] bg-surface p-sm"
      accessibilityRole="button"
      accessibilityLabel={`Open ${garment.title}`}
    >
      <View>
        <AppImage
          uri={resolveMediaUrl(garment.imageUrl)}
          accessibilityLabel={garment.title}
          aspectRatio={4 / 5}
          borderRadius={14}
        />
        {tag && (
          <Text
            className={`absolute left-sm top-sm overflow-hidden rounded-full px-[7px] py-xs font-mono-semibold text-[9.5px] ${
              inWash ? 'bg-match-goodBg text-match-goodFg' : 'bg-[#F3E6DB] text-[#8A5230]'
            }`}
          >
            {tag}
          </Text>
        )}
      </View>
      <View className="px-xxs pb-xxs pt-sm">
        <Text className="font-sans-bold text-[13px] text-ink-primary" numberOfLines={1}>
          {garment.title}
        </Text>
        <Text className="mt-xxs font-mono text-[10px] text-neutral-500" numberOfLines={1}>
          {garment.sourceStore ?? garment.category}
        </Text>
      </View>
    </PressableScale>
  );
}
