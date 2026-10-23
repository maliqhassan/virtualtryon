import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppImage } from '@/components/app-image';
import { AppProgressBar } from '@/components/app-progress-bar';
import { AppScaffold } from '@/components/app-scaffold';
import { CameraCaptureView } from '@/components/camera-capture-view';
import { FadeInView } from '@/components/fade-in-view';
import { ImagePreviewFrame } from '@/components/image-preview-frame';
import { ImageSourcePicker } from '@/components/image-source-picker';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { useImagePicker } from '@/hooks/use-image-picker';
import { confirmDestructiveAction } from '@/lib/confirm';
import { describeValidationError, validateImage } from '@/lib/images/validate-image';
import { resolveMediaUrl } from '@/lib/media-url';
import type { PickedImage } from '@/types';

import { PhotoTips } from '../components/photo-tips';
import { useDeleteMyPhotos, useMyPhotosQuery, useUploadMyPhoto } from '../hooks/use-my-photo';
import { PHOTO_ANGLES, displayUrl, type PhotoAngle } from '../types';

function isAngle(value: unknown): value is PhotoAngle {
  return value === 'front' || value === 'side' || value === 'back';
}

const VIEW_HINT: Record<PhotoAngle, string> = {
  front: 'Used for every try-on. Stand straight, facing the camera, head to feet in view.',
  side: 'Optional. Turn sideways so we can show your side view.',
  back: 'Optional. Turn around so we can show your back view.',
};

export function MyPhotoScreen() {
  const params = useLocalSearchParams<{ angle?: string }>();
  const [angle, setAngle] = useState<PhotoAngle>(isAngle(params.angle) ? params.angle : 'front');
  const photosQuery = useMyPhotosQuery();
  const upload = useUploadMyPhoto();
  const deletePhotos = useDeleteMyPhotos();
  const { pickFromGallery, fault } = useImagePicker();

  const [selected, setSelected] = useState<PickedImage | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const photos = photosQuery.data ?? [];
  const current = photos.find((p) => p.angle === angle) ?? null;
  const validationError = selected ? validateImage(selected) : null;

  const switchView = (next: PhotoAngle) => {
    setAngle(next);
    setSelected(null);
    setReplacing(false);
    upload.reset();
  };

  const handlePickFromGallery = useCallback(async () => {
    const image = await pickFromGallery();
    if (image) {
      upload.reset();
      setSelected(image);
    }
  }, [pickFromGallery, upload]);

  const handleCapture = useCallback(
    (image: PickedImage) => {
      setShowCamera(false);
      upload.reset();
      setSelected(image);
    },
    [upload],
  );

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    upload.mutate(
      { image: selected, angle },
      {
        onSuccess: () => {
          setSelected(null);
          setReplacing(false);
          // The front photo is what the user came for; go back to try it on.
          if (angle === 'front' && router.canGoBack()) router.back();
        },
      },
    );
  }, [angle, selected, upload]);

  const handleDeleteAll = useCallback(async () => {
    const confirmed = await confirmDestructiveAction(
      'Delete your photos?',
      'All your photos (front, side and back) and every copy made for try-ons will be removed from our servers.',
    );
    if (confirmed) deletePhotos.mutate();
  }, [deletePhotos]);

  if (showCamera) {
    return <CameraCaptureView onCapture={handleCapture} onCancel={() => setShowCamera(false)} />;
  }

  const showPicker = !selected && (!current || replacing);

  return (
    <AppScaffold back>
      <ScreenHeader
        eyebrow="Your photos"
        title="My photo"
        subtitle="Add your photo once and use it for every try-on. Side and back views are optional."
      />

      <View className="flex-row gap-sm rounded-full bg-muted p-xs">
        {PHOTO_ANGLES.map((view) => {
          const active = view.angle === angle;
          const added = photos.some((p) => p.angle === view.angle);
          return (
            <Pressable
              key={view.angle}
              onPress={() => switchView(view.angle)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${view.label} view${added ? ', added' : ''}`}
              className={[
                'flex-1 items-center rounded-full py-sm',
                active ? 'bg-inverse' : 'bg-transparent',
              ].join(' ')}
            >
              <Text
                className={
                  active ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-ink-primary'
                }
              >
                {view.label}
                {added ? ' ✓' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-sm text-sm text-ink-secondary">{VIEW_HINT[angle]}</Text>

      {fault === 'permission_denied' && (
        <Text className="mt-md text-error" accessibilityRole="alert">
          Photo access was denied. You can allow it in your device settings.
        </Text>
      )}

      {photosQuery.isLoading && (
        <View className="mt-xl w-2/3 self-center">
          <Skeleton aspectRatio={3 / 4} radius={20} />
        </View>
      )}

      {current && !selected && !replacing && (
        <FadeInView key={current.id} className="mt-xl gap-md">
          <View className="w-2/3 self-center overflow-hidden rounded-[24px] border border-border">
            <AppImage
              uri={resolveMediaUrl(displayUrl(current))}
              accessibilityLabel={`Your ${angle} view`}
              aspectRatio={3 / 4}
              fit="contain"
              borderRadius={0}
            />
          </View>
          {!current.cutoutUrl && (
            <Text className="text-center text-xs text-ink-secondary">
              We couldn’t remove the background from this photo, so it’s shown as it is.
            </Text>
          )}
          <AppButton
            label={`Replace ${angle} photo`}
            variant="dark"
            onPress={() => setReplacing(true)}
          />
        </FadeInView>
      )}

      {showPicker && !photosQuery.isLoading && (
        <View className="mt-xl gap-lg">
          {angle === 'front' && <PhotoTips />}
          <ImageSourcePicker
            onPickFromGallery={handlePickFromGallery}
            onOpenCamera={() => setShowCamera(true)}
          />
          {replacing && (
            <AppButton label="Cancel" variant="secondary" onPress={() => setReplacing(false)} />
          )}
        </View>
      )}

      {selected && (
        <View className="mt-xl gap-md">
          <ImagePreviewFrame
            uri={selected.uri}
            width={selected.width}
            height={selected.height}
            validationErrorText={validationError ? describeValidationError(validationError) : null}
            accessibilityLabel="Selected photo preview"
          />

          {upload.isPending && (
            <View className="gap-sm" accessibilityLiveRegion="polite">
              <Text className="text-ink-secondary">
                {upload.progress < 100
                  ? `Uploading… ${upload.progress}%`
                  : 'Checking your photo and removing the background…'}
              </Text>
              <AppProgressBar value={upload.progress} />
            </View>
          )}

          {upload.isError && (
            <Text className="text-error" accessibilityRole="alert">
              {upload.error.message}
            </Text>
          )}

          <AppButton
            label="Use this photo"
            onPress={handleConfirm}
            disabled={!!validationError || upload.isPending}
          />
          <AppButton
            label="Choose a different photo"
            variant="secondary"
            onPress={() => {
              setSelected(null);
              upload.reset();
            }}
            disabled={upload.isPending}
          />
        </View>
      )}

      {photos.length > 0 && !selected && (
        <View className="mt-xxxl">
          <AppButton
            label={deletePhotos.isPending ? 'Deleting…' : 'Delete all my photos'}
            variant="secondary"
            tone="destructive"
            onPress={handleDeleteAll}
            disabled={deletePhotos.isPending}
          />
        </View>
      )}

      <Text className="mt-xl text-center text-xs text-ink-secondary">
        Your photos are only used to create your try-ons. You can delete them at any time.
      </Text>
    </AppScaffold>
  );
}
