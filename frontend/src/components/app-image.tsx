import { Image } from 'expo-image';
import { Text, View } from 'react-native';

export type AppImageProps = {
  uri: string | null;
  accessibilityLabel: string;
  aspectRatio?: number;
  borderRadius?: number;
  placeholderText?: string;
};

/**
 * Image-or-neutral-placeholder, extracted as a shared primitive.
 * `SourceImagesRow`'s own comment (frontend/src/features/tryon/components/source-images-row.tsx)
 * named this exact pattern's third occurrence as "a real candidate for a
 * shared AppImage primitive next time this pattern recurs" — Saved Looks'
 * cards/details screen (three images each) is that next time. The three
 * pre-existing occurrences (SourceImagesRow, ProcessingImagesRow,
 * ResultCanvas) are deliberately left as they are — retrofitting
 * already-shipped, already-reviewed components isn't this feature's job.
 */
export function AppImage({
  uri,
  accessibilityLabel,
  aspectRatio = 1,
  borderRadius = 10,
  placeholderText = 'Unavailable',
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
      contentFit="cover"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
