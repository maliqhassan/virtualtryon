import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { resolveMediaUrl } from '@/lib/media-url';

import type { Garment } from '../types';

/** A small square photo of a piece, for rows and outfit strips. */
export function GarmentThumb({ garment, size = 52 }: { garment: Garment; size?: number }) {
  return (
    <View className="overflow-hidden rounded-md bg-muted" style={{ width: size, height: size }}>
      <Image
        source={{ uri: resolveMediaUrl(garment.imageUrl) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel={garment.title}
      />
    </View>
  );
}
