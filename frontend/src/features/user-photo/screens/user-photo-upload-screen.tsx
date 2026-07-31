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

import { ImagePreview } from '../components/image-preview';
import { usePreparePhoto } from '../hooks/use-prepare-photo';
import { useUploadSessionStore } from '../store/upload-session';

export function UserPhotoUploadScreen() {
  const { pickFromGallery, fault } = useImagePicker();
  const [showCamera, setShowCamera] = useState(false);
  const selectedImage = useUploadSessionStore((s) => s.selectedImage);
  const validationError = useUploadSessionStore((s) => s.validationError);
  const setSelectedImage = useUploadSessionStore((s) => s.setSelectedImage);
  const clearSelectedImage = useUploadSessionStore((s) => s.clearSelectedImage);

  const prepare = usePreparePhoto();

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

  const handleChooseDifferent = useCallback(() => {
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
      <Text className="text-2xl font-bold text-ink-primary">Add your photo</Text>
      <Text className="mt-xs text-ink-secondary">
        Used to generate your virtual try-on. Choose a clear, well-lit photo.
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
          <ImagePreview
            image={selectedImage}
            validationError={validationError}
            onChooseDifferent={handleChooseDifferent}
            onConfirm={handleConfirm}
            confirmDisabled={prepare.isPending}
          />
        )}

        {prepare.isPending && (
          <View className="mt-lg gap-sm" accessibilityLiveRegion="polite">
            <Text className="text-ink-secondary">Preparing your photo… {prepare.progress}%</Text>
            <AppProgressBar value={prepare.progress} />
          </View>
        )}

        {prepare.isError && (
          <View className="mt-lg gap-md">
            <Text className="text-error" accessibilityRole="alert">
              Couldn&rsquo;t prepare your photo. {prepare.error.message}
            </Text>
            <AppButton label="Try Again" variant="secondary" onPress={handleConfirm} />
          </View>
        )}

        {prepare.isSuccess && (
          <View className="mt-lg gap-md" accessibilityLiveRegion="polite">
            <Text className="text-lg font-semibold text-success">Photo ready</Text>
            <Text className="text-ink-secondary">Reference: {prepare.data.photoId}</Text>
            <Link href="/garment-upload" className="mt-sm text-sm font-semibold text-primary">
              Next: add a garment →
            </Link>
          </View>
        )}
      </View>
    </AppScaffold>
  );
}
