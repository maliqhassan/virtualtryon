import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import type { PickedImage } from '@/types';

// Purpose-built for the results screen, not a reuse of ProcessingImagesRow:
// that component's "— Ready" status language is specific to the upload
// flow and would read oddly here, and these thumbnails are secondary,
// smaller-treatment content next to the generated result. Note in the
// architecture brief: this is the third "image or placeholder" occurrence
// in the app — a real candidate for a shared AppImage primitive next time,
// not unified now to keep this feature's scope contained.
function SourceThumbnail({ label, image }: { label: string; image: PickedImage | null }) {
  return (
    <View className="flex-1 gap-xs">
      {image ? (
        <Image
          source={{ uri: image.uri }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 10 }}
          contentFit="cover"
          accessibilityLabel={`${label} thumbnail`}
        />
      ) : (
        <View className="aspect-square w-full items-center justify-center rounded-md bg-neutral-200">
          <Text className="text-xs text-ink-secondary">Unavailable</Text>
        </View>
      )}
      <Text className="text-center text-xs text-ink-secondary">{label}</Text>
    </View>
  );
}

type SourceImagesRowProps = {
  userImage: PickedImage | null;
  garmentImage: PickedImage | null;
};

export function SourceImagesRow({ userImage, garmentImage }: SourceImagesRowProps) {
  return (
    <View className="flex-row gap-sm">
      <SourceThumbnail label="You" image={userImage} />
      <SourceThumbnail label="Garment" image={garmentImage} />
    </View>
  );
}
