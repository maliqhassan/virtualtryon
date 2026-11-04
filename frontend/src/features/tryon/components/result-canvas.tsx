import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StripeFill } from '@/components/stripe-fill';

type ResultCanvasProps = {
  /** The image to show; null shows a striped placeholder with `placeholderCaption`. */
  uri: string | null;
  placeholderCaption?: string;
  /** Laid over the bottom of the image (the glass caption on the result). */
  overlay?: ReactNode;
};

/** The large try-on image on the dark stage, 3:4.15 at radius 28. */
export function ResultCanvas({ uri, placeholderCaption, overlay }: ResultCanvasProps) {
  return (
    <View className="w-full overflow-hidden rounded-hero" style={{ aspectRatio: 3 / 4.15 }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Try-on result"
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <StripeFill tone="dark" period={9} />
          <Text className="font-mono text-[10px] text-neutral-500">{placeholderCaption}</Text>
        </View>
      )}
      {overlay && <View className="absolute bottom-md left-md right-md">{overlay}</View>}
    </View>
  );
}
