import { Image } from 'expo-image';
import { Text, View } from 'react-native';

type ImagePreviewFrameProps = {
  uri: string;
  width: number;
  height: number;
  validationErrorText?: string | null;
  accessibilityLabel: string;
};

/**
 * The image + validation-message display shared by every feature that
 * previews a picked image. Deliberately doesn't render any action buttons —
 * those differ per feature (user-photo: confirm/choose-different; garment:
 * confirm/replace/delete) and stay in each feature's own component.
 */
export function ImagePreviewFrame({
  uri,
  width,
  height,
  validationErrorText,
  accessibilityLabel,
}: ImagePreviewFrameProps) {
  return (
    <View className="gap-md">
      {/* Inline style (not className) is deliberate here: aspectRatio is
          runtime-computed from the picked image, not a fixed token. */}
      <Image
        source={{ uri }}
        style={{ width: '100%', aspectRatio: width / height, borderRadius: 12 }}
        contentFit="cover"
        accessibilityLabel={accessibilityLabel}
      />
      {validationErrorText && (
        <Text className="text-error" accessibilityRole="alert">
          {validationErrorText}
        </Text>
      )}
    </View>
  );
}
