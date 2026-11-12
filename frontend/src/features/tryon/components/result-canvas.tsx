import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StripeFill } from '@/components/stripe-fill';

type ResultCanvasProps = {
  /** The image to show; null shows a striped placeholder with `placeholderCaption`. */
  uri: string | null;
  placeholderCaption?: string;
  accessibilityLabel: string;
  /** A small tag top-left ("Before"). */
  tag?: string;
  /** Laid over the bottom-left corner (the glass chip). */
  bottomLeft?: ReactNode;
  /** Laid over the bottom-right corner (send and eye). */
  bottomRight?: ReactNode;
};

/** The large try-on image on the light result screen, 3:4.15 at radius 28. */
export function ResultCanvas({
  uri,
  placeholderCaption,
  accessibilityLabel,
  tag,
  bottomLeft,
  bottomRight,
}: ResultCanvasProps) {
  return (
    <View
      className="w-full overflow-hidden rounded-hero bg-muted"
      style={{ aspectRatio: 3 / 4.15 }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={accessibilityLabel}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <StripeFill tone="warm" />
          <Text className="font-mono text-[10px] text-ink-secondary">{placeholderCaption}</Text>
        </View>
      )}
      {tag && (
        <Text className="absolute left-[14px] top-[14px] overflow-hidden rounded-full bg-[rgba(22,19,15,0.7)] px-[11px] py-[6px] font-sans-bold text-[11px] text-cream">
          {tag}
        </Text>
      )}
      {(bottomLeft || bottomRight) && (
        <View className="absolute bottom-[14px] left-[14px] right-[14px] flex-row items-end justify-between gap-sm">
          <View className="flex-shrink">{bottomLeft}</View>
          {bottomRight}
        </View>
      )}
    </View>
  );
}
