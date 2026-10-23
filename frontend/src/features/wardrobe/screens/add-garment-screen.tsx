import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { CameraCaptureView } from '@/components/camera-capture-view';
import { ImagePreviewFrame } from '@/components/image-preview-frame';
import { ImageSourcePicker } from '@/components/image-source-picker';
import { useImagePicker } from '@/hooks/use-image-picker';
import { describeValidationError, validateImage } from '@/lib/images/validate-image';
import type { ImageValidationErrorCode, PickedImage } from '@/types';

import { CategoryPickerModal } from '../components/category-picker-modal';
import { useCreateGarment } from '../hooks/use-create-garment';

export function AddGarmentScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { pickFromGallery, fault, clearFault } = useImagePicker();
  const createGarment = useCreateGarment();

  const [showCamera, setShowCamera] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [validationError, setValidationError] = useState<ImageValidationErrorCode | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

  const handlePicked = useCallback((picked: PickedImage) => {
    setImage(picked);
    setValidationError(validateImage(picked));
    setShowCamera(false);
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    const picked = await pickFromGallery();
    if (picked) handlePicked(picked);
  }, [pickFromGallery, handlePicked]);

  const handleRemoveImage = useCallback(() => {
    setImage(null);
    setValidationError(null);
  }, []);

  const canSubmit = !!image && !validationError && title.trim().length > 0 && !!category;

  const handleSubmit = useCallback(() => {
    if (!image || !category) return;
    createGarment.mutate(
      { image, title: title.trim(), category },
      {
        onSuccess: (garment) =>
          // Opened from Try On: go back there with the new piece selected.
          returnTo === 'tryon'
            ? router.dismissTo({ pathname: '/', params: { selected: garment.id } })
            : router.back(),
      },
    );
  }, [image, category, title, createGarment, returnTo]);

  if (showCamera) {
    return <CameraCaptureView onCapture={handlePicked} onCancel={() => setShowCamera(false)} />;
  }

  return (
    <AppScaffold back>
      <Text className="font-display text-[34px] leading-[38px] text-ink-primary">Add a piece</Text>

      {fault && (
        <Text className="mt-sm text-error" accessibilityRole="alert">
          {fault === 'permission_denied'
            ? 'Photo library access is needed to choose a photo.'
            : 'Something went wrong picking that photo — try again.'}
        </Text>
      )}

      {!image ? (
        <View className="mt-lg">
          <ImageSourcePicker
            onPickFromGallery={() => {
              clearFault();
              void handlePickFromGallery();
            }}
            onOpenCamera={() => {
              clearFault();
              setShowCamera(true);
            }}
          />
        </View>
      ) : (
        <View className="mt-lg gap-lg">
          <ImagePreviewFrame
            uri={image.uri}
            width={image.width}
            height={image.height}
            validationErrorText={validationError ? describeValidationError(validationError) : null}
            accessibilityLabel="Garment photo"
          />

          <View className="gap-xs">
            <Text className="text-sm font-semibold text-ink-secondary">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Blue Denim Jacket"
              maxLength={200}
              className="rounded-md border border-border px-md py-sm text-ink-primary"
            />
          </View>

          <View className="gap-xs">
            <Text className="text-sm font-semibold text-ink-secondary">Category</Text>
            <Pressable
              onPress={() => setIsCategoryPickerOpen(true)}
              accessibilityRole="button"
              className="rounded-md border border-border px-md py-sm"
            >
              <Text className={category ? 'text-ink-primary' : 'text-ink-secondary'}>
                {category ?? 'Choose a category'}
              </Text>
            </Pressable>
          </View>

          <View className="gap-md">
            <AppButton
              label={createGarment.isPending ? 'Adding…' : 'Add to Wardrobe'}
              variant="primary"
              onPress={handleSubmit}
              disabled={!canSubmit || createGarment.isPending}
            />
            <AppButton
              label="Choose a Different Photo"
              variant="secondary"
              onPress={handleRemoveImage}
            />
          </View>

          {createGarment.isError && (
            <Text className="text-error" accessibilityRole="alert">
              Couldn’t add this garment. Check your connection and try again.
            </Text>
          )}
        </View>
      )}

      <CategoryPickerModal
        visible={isCategoryPickerOpen}
        selected={category}
        onCancel={() => setIsCategoryPickerOpen(false)}
        onSelect={(selected) => {
          setCategory(selected);
          setIsCategoryPickerOpen(false);
        }}
      />
    </AppScaffold>
  );
}
