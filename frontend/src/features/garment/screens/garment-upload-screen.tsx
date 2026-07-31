import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppProgressBar } from '@/components/app-progress-bar';
import { AppScaffold } from '@/components/app-scaffold';
import { CameraCaptureView } from '@/components/camera-capture-view';
import { ImageSourcePicker } from '@/components/image-source-picker';
import { useImagePicker } from '@/hooks/use-image-picker';
import { validateImage } from '@/lib/images/validate-image';
import type { PickedImage } from '@/types';

import { GarmentImagePreview } from '../components/garment-image-preview';
import { usePrepareGarment } from '../hooks/use-prepare-garment';
import { useGarmentSessionStore } from '../store/garment-session';

export function GarmentUploadScreen() {
  const { pickFromGallery, fault } = useImagePicker();
  const [showCamera, setShowCamera] = useState(false);
  const selectedImage = useGarmentSessionStore((s) => s.selectedImage);
  const validationError = useGarmentSessionStore((s) => s.validationError);
  const setSelectedImage = useGarmentSessionStore((s) => s.setSelectedImage);
  const clearSelectedImage = useGarmentSessionStore((s) => s.clearSelectedImage);

  const prepare = usePrepareGarment();

  const handlePicked = useCallback(
    (image: PickedImage) => {
      setSelectedImage(image, validateImage(image));
    },
    [setSelectedImage],
  );

  const handlePickFromGallery = useCallback(async () => {
    const image = await pickFromGallery();
    if (image) handlePicked(image);
  }, [pickFromGallery, handlePicked]);

  const handleCameraCapture = useCallback(
    (image: PickedImage) => {
      setShowCamera(false);
      handlePicked(image);
    },
    [handlePicked],
  );

  const handleConfirm = useCallback(() => {
    if (!selectedImage) return;
    prepare.mutate(selectedImage);
  }, [selectedImage, prepare]);

  // Replace and Delete both reset to the empty picker-choice state — see
  // GarmentImagePreview for why they aren't functionally different yet.
  const handleClearSelection = useCallback(() => {
    clearSelectedImage();
    prepare.reset();
  }, [clearSelectedImage, prepare]);

  if (showCamera) {
    return (
      <CameraCaptureView onCapture={handleCameraCapture} onCancel={() => setShowCamera(false)} />
    );
  }

  return (
    <AppScaffold>
      <Text className="text-2xl font-bold text-ink-primary">Add a clothing item</Text>
      <Text className="mt-xs text-ink-secondary">
        Used to generate your virtual try-on. A single item, laid flat or on a hanger, works best.
      </Text>

      <View className="mt-xl">
        {fault === 'permission_denied' && (
          <Text className="mb-md text-error" accessibilityRole="alert">
            Permission was denied. Enable photo access in your device settings to continue.
          </Text>
        )}
        {fault === 'unknown_error' && (
          <Text className="mb-md text-error" accessibilityRole="alert">
            Something went wrong opening the picker. Please try again.
          </Text>
        )}

        {!selectedImage && (
          <ImageSourcePicker
            onPickFromGallery={handlePickFromGallery}
            onOpenCamera={() => setShowCamera(true)}
          />
        )}

        {selectedImage && !prepare.isSuccess && (
          <GarmentImagePreview
            image={selectedImage}
            validationError={validationError}
            onConfirm={handleConfirm}
            onReplace={handleClearSelection}
            onDelete={handleClearSelection}
            actionsDisabled={prepare.isPending}
          />
        )}

        {prepare.isPending && (
          <View className="mt-lg gap-sm" accessibilityLiveRegion="polite">
            <Text className="text-ink-secondary">Preparing your garment… {prepare.progress}%</Text>
            <AppProgressBar value={prepare.progress} />
          </View>
        )}

        {prepare.isError && (
          <View className="mt-lg gap-md">
            <Text className="text-error" accessibilityRole="alert">
              Couldn&rsquo;t prepare this item. {prepare.error.message}
            </Text>
            <AppButton label="Try Again" variant="secondary" onPress={handleConfirm} />
          </View>
        )}

        {prepare.isSuccess && (
          <View className="mt-lg gap-md" accessibilityLiveRegion="polite">
            <Text className="text-lg font-semibold text-success">Garment ready</Text>
            <Text className="text-ink-secondary">Reference: {prepare.data.garmentId}</Text>
            <AppButton label="Replace Photo" variant="secondary" onPress={handleClearSelection} />
            <AppButton
              label="Delete Photo"
              variant="secondary"
              tone="destructive"
              onPress={handleClearSelection}
            />
            <Link href="/tryon-processing" className="mt-sm text-sm font-semibold text-primary">
              Generate your try-on →
            </Link>
          </View>
        )}
      </View>
    </AppScaffold>
  );
}
