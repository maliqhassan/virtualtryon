import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ImagePreviewFrame } from '@/components/image-preview-frame';
import { describeValidationError } from '@/lib/images/validate-image';
import type { ImageValidationErrorCode, PickedImage } from '@/types';

type ImagePreviewProps = {
  image: PickedImage;
  validationError: ImageValidationErrorCode | null;
  onChooseDifferent: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
};

export function ImagePreview({
  image,
  validationError,
  onChooseDifferent,
  onConfirm,
  confirmDisabled = false,
}: ImagePreviewProps) {
  return (
    <View className="gap-md">
      <ImagePreviewFrame
        uri={image.uri}
        width={image.width}
        height={image.height}
        validationErrorText={validationError ? describeValidationError(validationError) : null}
        accessibilityLabel="Selected photo preview"
      />

      <View className="gap-md">
        <AppButton
          label="Use This Photo"
          variant="primary"
          onPress={onConfirm}
          disabled={!!validationError || confirmDisabled}
        />
        <AppButton
          label="Choose a Different Photo"
          variant="secondary"
          onPress={onChooseDifferent}
        />
      </View>
    </View>
  );
}
