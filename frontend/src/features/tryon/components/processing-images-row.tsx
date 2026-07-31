import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import type { PickedImage } from '@/types';

type ImageStatusProps = {
  label: string;
  image: PickedImage | null;
  ready: boolean;
};

function ImageStatus({ label, image, ready }: ImageStatusProps) {
  return (
    <View className="flex-1 gap-sm">
      {image ? (
        <Image
          source={{ uri: image.uri }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
          contentFit="cover"
          accessibilityLabel={`${label} preview`}
        />
      ) : (
        <View className="aspect-square w-full items-center justify-center rounded-md bg-neutral-200">
          <Text className="text-xs text-ink-secondary">No image</Text>
        </View>
      )}
      <Text className="text-center text-xs font-semibold text-ink-secondary">
        {label}
        {ready ? ' — Ready' : ''}
      </Text>
    </View>
  );
}

type ProcessingImagesRowProps = {
  userImage: PickedImage | null;
  userReady: boolean;
  garmentImage: PickedImage | null;
  garmentReady: boolean;
};

export function ProcessingImagesRow({
  userImage,
  userReady,
  garmentImage,
  garmentReady,
}: ProcessingImagesRowProps) {
  return (
    <View className="mt-lg flex-row gap-md">
      <ImageStatus label="Your photo" image={userImage} ready={userReady} />
      <ImageStatus label="Garment" image={garmentImage} ready={garmentReady} />
    </View>
  );
}
