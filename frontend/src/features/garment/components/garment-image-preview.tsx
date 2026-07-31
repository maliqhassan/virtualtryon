import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ImagePreviewFrame } from '@/components/image-preview-frame';
import { describeValidationError } from '@/lib/images/validate-image';
import type { ImageValidationErrorCode, PickedImage } from '@/types';

type GarmentImagePreviewProps = {
  image: PickedImage;
  validationError: ImageValidationErrorCode | null;
  onConfirm: () => void;
  onReplace: () => void;
  onDelete: () => void;
  /** Disables all three actions while a prepare request is in flight. */
  actionsDisabled?: boolean;
};

// Replace and Delete both clear the current selection — the only
// difference is label/styling to signal intent, not the underlying
// mechanism. See this feature's design brief for why: a real behavioral
// difference (delete removes a list entry vs. replace swaps one in place)
// only exists once garments live in a list (Wardrobe, Milestone 7).
export function GarmentImagePreview({
  image,
  validationError,
  onConfirm,
  onReplace,
  onDelete,
  actionsDisabled = false,
}: GarmentImagePreviewProps) {
  return (
    <View className="gap-md">
      <ImagePreviewFrame
        uri={image.uri}
        width={image.width}
        height={image.height}
        validationErrorText={validationError ? describeValidationError(validationError) : null}
        accessibilityLabel="Selected clothing item preview"
      />

      <View className="gap-md">
        <AppButton
          label="Use This Photo"
          variant="primary"
          onPress={onConfirm}
          disabled={!!validationError || actionsDisabled}
        />
        <AppButton
          label="Replace Photo"
          variant="secondary"
          onPress={onReplace}
          disabled={actionsDisabled}
        />
        <AppButton
          label="Delete Photo"
          variant="secondary"
          tone="destructive"
          onPress={onDelete}
          disabled={actionsDisabled}
        />
      </View>
    </View>
  );
}
