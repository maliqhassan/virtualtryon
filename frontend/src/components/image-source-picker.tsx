import { View } from 'react-native';

import { AppButton } from '@/components/app-button';

type ImageSourcePickerProps = {
  onPickFromGallery: () => void;
  /** Opens the in-app camera view (CameraCaptureView) — not a direct capture call. */
  onOpenCamera: () => void;
  /** On the dark stage: cream and outlined-on-dark buttons. */
  dark?: boolean;
};

export function ImageSourcePicker({
  onPickFromGallery,
  onOpenCamera,
  dark = false,
}: ImageSourcePickerProps) {
  return (
    <View className="gap-md">
      <AppButton
        label="Take photo"
        variant={dark ? 'cream' : 'primary'}
        icon="photo_camera"
        onPress={onOpenCamera}
      />
      <AppButton
        label="Choose from gallery"
        variant={dark ? 'ghostDark' : 'secondary'}
        icon="photo_library"
        onPress={onPickFromGallery}
      />
    </View>
  );
}
