import { Image } from 'expo-image';
import { Text, View } from 'react-native';

export type AppImageProps = {
  uri: string | null;
  accessibilityLabel: string;
  aspectRatio?: number;
  borderRadius?: number;
  placeholderText?: string;
  /** cover fills the frame (default); contain shows the whole image, e.g. a person cut-out. */
  fit?: 'cover' | 'contain';
};

/**
 * Image-or-neutral-placeholder, the shared primitive for every image slot in
 * the app (wardrobe tiles, saved looks, the try-on screens).
 */
export function AppImage({
  uri,
  accessibilityLabel,
  aspectRatio = 1,
  borderRadius = 10,
  placeholderText = 'Unavailable',
  fit = 'cover',
}: AppImageProps) {
  if (!uri) {
    return (
      <View
        className="w-full items-center justify-center bg-neutral-200"
        style={{ aspectRatio, borderRadius }}
      >
        <Text className="text-xs text-ink-secondary">{placeholderText}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', aspectRatio, borderRadius }}
      contentFit={fit}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
