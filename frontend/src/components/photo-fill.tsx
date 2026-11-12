import { Image } from 'expo-image';
import { StyleSheet, Text } from 'react-native';

import { STOCK_PHOTOS, type StockPhoto } from '@/constants/stock-photos';

/**
 * Fills its parent (absolutely positioned, like StripeFill) with one of the
 * bundled stock photos, cropped to cover. Decorative: hidden from screen
 * readers and from touches, so the card around it carries the meaning and
 * the presses.
 */
export function PhotoFill({
  photo,
  position = 'top',
  fadeMs,
}: {
  photo: StockPhoto;
  /** Which part stays in view when cropped; people's heads are at the top. */
  position?: 'top' | 'center';
  /** Cross-fade when `photo` changes (e.g. between welcome slides). */
  fadeMs?: number;
}) {
  return (
    <Image
      source={STOCK_PHOTOS[photo]}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      contentPosition={position}
      transition={fadeMs}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** A small caption pill laid over a photo ("BEFORE", "wardrobe"). */
export function PhotoLabel({
  children,
  tone = 'light',
}: {
  children: string;
  /** light: on bright photos · dark: on the dark stage. */
  tone?: 'light' | 'dark';
}) {
  return (
    <Text
      className={`self-start overflow-hidden rounded-full px-sm py-[3px] font-mono-semibold text-[8.5px] ${
        tone === 'light'
          ? 'bg-[rgba(246,244,240,0.88)] text-ink-secondary'
          : 'bg-[rgba(18,17,15,0.6)] text-night-body'
      }`}
    >
      {children}
    </Text>
  );
}
