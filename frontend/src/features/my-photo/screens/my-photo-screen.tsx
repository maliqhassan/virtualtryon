import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { AppProgressBar } from '@/components/app-progress-bar';
import { AppScaffold } from '@/components/app-scaffold';
import { CameraCaptureView } from '@/components/camera-capture-view';
import { FadeInView } from '@/components/fade-in-view';
import { ImagePreviewFrame } from '@/components/image-preview-frame';
import { ImageSourcePicker } from '@/components/image-source-picker';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { themeColors } from '@/constants/theme';
import { useImagePicker } from '@/hooks/use-image-picker';
import { confirmDestructiveAction } from '@/lib/confirm';
import { describeValidationError, validateImage } from '@/lib/images/validate-image';
import { resolveMediaUrl } from '@/lib/media-url';
import type { PickedImage } from '@/types';

import { ANALYSING_HREF, StepHeader } from '@/features/onboarding';

import { GoldBrackets } from '../components/gold-brackets';
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
  const params = useLocalSearchParams<{ angle?: string; from?: string }>();
  const inOnboarding = params.from === 'onboarding';
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
          // In onboarding they stay, and "Analyse my style" moves them on.
          if (angle === 'front' && !inOnboarding && router.canGoBack()) router.back();
        },
      },
    );
  }, [angle, inOnboarding, selected, upload]);

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
  const hasFront = photos.some((p) => p.angle === 'front');

  return (
    <AppScaffold back={!inOnboarding} dark>
      {inOnboarding && (
        <View className="mb-xl">
          <StepHeader step={4} dark />
        </View>
      )}
      <ScreenHeader
        variant="editorial"
        dark
        title="One photo,"
        italic="every try-on."
        subtitle="Add your photo once and use it for every try-on. Side and back views are optional."
      />

      <View className="flex-row gap-xs rounded-full bg-[rgba(255,255,255,0.07)] p-xs">
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
                'flex-1 items-center rounded-full py-[9px]',
                active ? 'bg-cream' : 'bg-transparent',
              ].join(' ')}
            >
              <View className="flex-row items-center gap-xxs">
                <Text
                  className={
                    active
                      ? 'font-sans-bold text-[12.5px] text-ink-primary'
                      : 'font-sans-bold text-[12.5px] text-night-body'
                  }
                >
                  {view.label}
                </Text>
                {added && (
                  <AppIcon
                    name="check"
                    size="xs"
                    color={active ? themeColors.inkPrimary : themeColors.nightBody}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-sm font-sans text-sm text-night-body">{VIEW_HINT[angle]}</Text>

      {fault === 'permission_denied' && (
        <Text className="mt-md font-sans text-error" accessibilityRole="alert">
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
          <View className="overflow-hidden rounded-[26px] bg-[#211E1A]">
            <AppImage
              uri={resolveMediaUrl(displayUrl(current))}
              accessibilityLabel={`Your ${angle} view`}
              aspectRatio={3 / 4}
              fit="contain"
              borderRadius={0}
            />
            <GoldBrackets />
            <View className="absolute bottom-[18px] flex-row items-center gap-[6px] self-center rounded-full bg-[rgba(28,26,23,0.7)] px-md py-[7px]">
              <AppIcon name="check_circle" size={14} color="#7FC49C" />
              <Text className="font-mono-semibold text-[10.5px] text-[#7FC49C]">
                {current.cutoutUrl ? 'captured · background removed' : 'captured'}
              </Text>
            </View>
          </View>
          {!current.cutoutUrl && (
            <Text className="text-center font-sans text-xs text-night-body">
              We couldn’t remove the background from this photo, so it’s shown as it is.
            </Text>
          )}
          <AppButton
            label={`Replace ${angle} photo`}
            variant="ghostDark"
            icon="photo_camera"
            onPress={() => setReplacing(true)}
          />
        </FadeInView>
      )}

      {showPicker && !photosQuery.isLoading && (
        <View className="mt-xl gap-lg">
          {/* Onboarding showed the tips on the step before. */}
          {angle === 'front' && !inOnboarding && <PhotoTips />}
          <View className="aspect-[3/4] items-center justify-center overflow-hidden rounded-[26px] bg-[#1A1815]">
            <GoldBrackets />
            <AppIcon name="accessibility_new" size={64} color="rgba(242, 239, 234, 0.22)" />
            <Text className="mt-[10px] font-mono text-[10px] text-neutral-500">
              [ {angle} view ]
            </Text>
            <View className="absolute bottom-[18px] flex-row items-center gap-[6px] rounded-full bg-[rgba(28,26,23,0.7)] px-md py-[7px]">
              <AppIcon name="center_focus_weak" size={14} color="#D9B26A" />
              <Text className="font-mono-semibold text-[10.5px] text-gold-overline">
                {angle === 'front' ? 'required · stand straight' : 'optional'}
              </Text>
            </View>
          </View>
          <ImageSourcePicker
            dark
            onPickFromGallery={handlePickFromGallery}
            onOpenCamera={() => setShowCamera(true)}
          />
          {replacing && (
            <AppButton label="Cancel" variant="ghostDark" onPress={() => setReplacing(false)} />
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
              <Text className="font-sans text-night-body">
                {upload.progress < 100
                  ? `Uploading… ${upload.progress}%`
                  : 'Checking your photo and removing the background…'}
              </Text>
              <AppProgressBar value={upload.progress} />
            </View>
          )}

          {upload.isError && (
            <Text className="font-sans text-error" accessibilityRole="alert">
              {upload.error.message}
            </Text>
          )}

          <AppButton
            label="Use this photo"
            variant="cream"
            onPress={handleConfirm}
            disabled={!!validationError || upload.isPending}
          />
          <AppButton
            label="Choose a different photo"
            variant="ghostDark"
            onPress={() => {
              setSelected(null);
              upload.reset();
            }}
            disabled={upload.isPending}
          />
        </View>
      )}

      {inOnboarding && !selected && (
        <View className="mt-lg">
          <AppButton
            label="Analyse my style"
            variant="accent"
            icon="auto_awesome"
            onPress={() => router.push(ANALYSING_HREF)}
            disabled={!hasFront}
          />
        </View>
      )}

      {photos.length > 0 && !selected && !inOnboarding && (
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

      <Text className="mt-xl text-center font-sans text-[11px] leading-[17px] text-ink-secondary">
        {inOnboarding
          ? 'Side and back are optional, and make try-ons from other angles possible.\n'
          : ''}
        Your photos are only used to create your try-ons. You can delete them at any time.
      </Text>
    </AppScaffold>
  );
}
