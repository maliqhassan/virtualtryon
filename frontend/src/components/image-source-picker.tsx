import { View } from 'react-native';

import { AppButton } from '@/components/app-button';

type ImageSourcePickerProps = {
  onPickFromGallery: () => void;
  /** Opens the in-app camera view (CameraCaptureView) — not a direct capture call. */
  onOpenCamera: () => void;
};

export function ImageSourcePicker({ onPickFromGallery, onOpenCamera }: ImageSourcePickerProps) {
  return (
    <View className="gap-md">
      <AppButton label="Take Photo" variant="primary" onPress={onOpenCamera} />
      <AppButton label="Choose from Gallery" variant="secondary" onPress={onPickFromGallery} />
    </View>
  );
}
