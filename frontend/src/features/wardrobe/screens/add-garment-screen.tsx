import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { CameraCaptureView } from '@/components/camera-capture-view';
import { ImagePreviewFrame } from '@/components/image-preview-frame';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { themeColors } from '@/constants/theme';
import { useImagePicker } from '@/hooks/use-image-picker';
import { describeValidationError, validateImage } from '@/lib/images/validate-image';
import type { ImageValidationErrorCode, PickedImage } from '@/types';

import { CategoryPickerModal } from '../components/category-picker-modal';
import { useCreateGarment } from '../hooks/use-create-garment';
import { tryOnGarmentHref } from '../routes';

// A plain path, not shop's SHOP_HREF: shop already depends on wardrobe.
const SHOP_PATH = '/shop' as Href;

/** One way to add a piece, as a tile in the 2×2 grid. The default is dark. */
function OptionTile({
  icon,
  title,
  caption,
  dark = false,
  onPress,
}: {
  icon: string;
  title: string;
  caption: string;
  dark?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${caption}`}
      containerStyle={{ width: '48.5%' }}
      className={`rounded-[18px] p-lg ${dark ? 'bg-inverse' : 'border border-border bg-surface'}`}
    >
      <AppIcon name={icon} size={24} color={dark ? themeColors.goldSoft : themeColors.primary} />
      <Text
        className={`mt-[9px] font-sans-bold text-[13.5px] ${dark ? 'text-ink-onPrimary' : 'text-ink-primary'}`}
      >
        {title}
      </Text>
      <Text
        className={`mt-xxs font-sans text-[11px] ${dark ? 'text-neutral-400' : 'text-ink-secondary'}`}
      >
        {caption}
      </Text>
    </PressableScale>
  );
}

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
          returnTo === 'tryon' ? router.dismissTo(tryOnGarmentHref(garment.id)) : router.back(),
      },
    );
  }, [image, category, title, createGarment, returnTo]);

  if (showCamera) {
    return <CameraCaptureView onCapture={handlePicked} onCancel={() => setShowCamera(false)} />;
  }

  return (
    <AppScaffold back>
      <ScreenHeader
        title="Add pieces"
        subtitle="Photograph it, pick it from your camera roll, or bring it from a store."
      />

      {fault && (
        <Text className="mt-sm font-sans text-error" accessibilityRole="alert">
          {fault === 'permission_denied'
            ? 'Photo library access is needed to choose a photo.'
            : 'Something went wrong picking that photo — try again.'}
        </Text>
      )}

      {!image ? (
        <View className="mt-lg flex-row flex-wrap justify-between gap-y-[10px]">
          <OptionTile
            icon="photo_library"
            title="Camera roll"
            caption="Pick a photo you have"
            dark
            onPress={() => {
              clearFault();
              void handlePickFromGallery();
            }}
          />
          <OptionTile
            icon="photo_camera"
            title="Camera"
            caption="Snap it now"
            onPress={() => {
              clearFault();
              setShowCamera(true);
            }}
          />
          <OptionTile
            icon="link"
            title="Store link"
            caption="Paste in Shop"
            onPress={() => router.navigate(SHOP_PATH)}
          />
          <OptionTile
            icon="receipt_long"
            title="Receipt"
            caption="Coming soon"
            onPress={() =>
              Alert.alert('Coming soon', 'Adding pieces from a receipt arrives in an update.')
            }
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
            <Text className="font-sans-semibold text-sm text-ink-secondary">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Blue Denim Jacket"
              maxLength={200}
              className="rounded-md border border-border px-md py-sm font-sans text-ink-primary"
            />
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-sm text-ink-secondary">Category</Text>
            <Pressable
              onPress={() => setIsCategoryPickerOpen(true)}
              accessibilityRole="button"
              className="rounded-md border border-border px-md py-sm"
            >
              <Text
                className={category ? 'font-sans text-ink-primary' : 'font-sans text-ink-secondary'}
              >
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
            <Text className="font-sans text-error" accessibilityRole="alert">
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
