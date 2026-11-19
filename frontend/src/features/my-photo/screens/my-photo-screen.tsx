import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

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
import { useImagePicker } from '@/hooks/use-image-picker';
import { confirmDestructiveAction } from '@/lib/confirm';
import { selectionFeedback } from '@/lib/haptics';
import { describeValidationError, validateImage } from '@/lib/images/validate-image';
import { resolveMediaUrl } from '@/lib/media-url';
import type { PickedImage } from '@/types';

import { ANALYSING_HREF, StepHeader } from '@/features/onboarding';

import { GoldBrackets } from '../components/gold-brackets';
import { PhotoTips } from '../components/photo-tips';
import { useDeleteMyPhoto, useDeleteMyPhotos, useUploadMyPhoto } from '../hooks/use-my-photo';
import { usePortraits } from '../hooks/use-portraits';
import { MAX_MODEL_PHOTOS, displayUrl } from '../types';

/**
 * My photos: up to MAX_MODEL_PHOTOS photos of the user, and which one
 * try-ons use. The photo in view is shown large; the row below lists them
 * all, with "+" to add another. A new photo becomes the one in use.
 * Opened with ?pick=1 ("Add portrait") it goes straight to the picker and
 * returns once the photo is added; with ?from=onboarding it's step 4.
 */
export function MyPhotoScreen() {
  const params = useLocalSearchParams<{ from?: string; pick?: string }>();
  const inOnboarding = params.from === 'onboarding';
  const { ordered, inUseId, select, isFull, isLoading } = usePortraits();
  const upload = useUploadMyPhoto();
  const deleteOne = useDeleteMyPhoto();
  const deletePhotos = useDeleteMyPhotos();
  const [showCamera, setShowCamera] = useState(false);
  const { pickFromGallery, fault } = useImagePicker({ onUseCamera: () => setShowCamera(true) });

  const [selected, setSelected] = useState<PickedImage | null>(null);
  const [adding, setAdding] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewing =
    ordered.find((p) => p.id === viewingId) ?? ordered.find((p) => p.id === inUseId) ?? null;
  const validationError = selected ? validateImage(selected) : null;

  const handlePickFromGallery = useCallback(async () => {
    const image = await pickFromGallery();
    if (image) {
      upload.reset();
      setSelected(image);
    }
  }, [pickFromGallery, upload]);

  // "Add portrait" opens this screen with ?pick=1: straight to the picker
  // (through Photo access the first time), once.
  const pickedOnOpen = useRef(false);
  useEffect(() => {
    if (params.pick !== '1' || pickedOnOpen.current || isLoading || isFull) return;
    pickedOnOpen.current = true;
    void handlePickFromGallery();
  }, [params.pick, isLoading, isFull, handlePickFromGallery]);

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
      { image: selected },
      {
        onSuccess: (photo) => {
          setSelected(null);
          setAdding(false);
          setViewingId(photo.id);
          // Came here just to add one ("Add portrait"): back to where they were.
          if (params.pick === '1' && !inOnboarding && router.canGoBack()) router.back();
        },
      },
    );
  }, [inOnboarding, params.pick, selected, upload]);

  const handleDeleteOne = useCallback(async () => {
    if (!viewing) return;
    const confirmed = await confirmDestructiveAction(
      'Delete this photo?',
      'It will be removed from our servers. Try-ons you already made stay.',
    );
    if (!confirmed) return;
    deleteOne.mutate(viewing.id, { onSuccess: () => setViewingId(null) });
  }, [deleteOne, viewing]);

  const handleDeleteAll = useCallback(async () => {
    const confirmed = await confirmDestructiveAction(
      'Delete all your photos?',
      'Every photo of you and every copy made for try-ons will be removed from our servers.',
    );
    if (confirmed) deletePhotos.mutate();
  }, [deletePhotos]);

  if (showCamera) {
    return <CameraCaptureView onCapture={handleCapture} onCancel={() => setShowCamera(false)} />;
  }

  const showPicker = !selected && !isLoading && !isFull && (ordered.length === 0 || adding);
  const showViewer = !!viewing && !selected && !showPicker;
  const viewingInUse = viewing?.id === inUseId;

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
        title="Your photos,"
        italic="any try-on."
        subtitle={`Save up to ${MAX_MODEL_PHOTOS} photos of yourself, then pick the one to try clothes on.`}
      />

      {fault === 'permission_denied' && (
        <Text className="mt-md font-sans text-error" accessibilityRole="alert">
          Photo access was denied. You can allow it in your device settings.
        </Text>
      )}

      {isLoading && (
        <View className="mt-xl w-2/3 self-center">
          <Skeleton aspectRatio={3 / 4} radius={20} dark />
        </View>
      )}

      {showViewer && viewing && (
        <FadeInView key={viewing.id} className="mt-xl gap-md">
          <View className="overflow-hidden rounded-[26px] bg-[#211E1A]">
            <AppImage
              uri={resolveMediaUrl(displayUrl(viewing))}
              accessibilityLabel={viewingInUse ? 'Your photo in use for try-ons' : 'Your photo'}
              aspectRatio={3 / 4}
              fit="contain"
              borderRadius={0}
            />
            <GoldBrackets />
            <View className="absolute bottom-[18px] flex-row items-center gap-[6px] self-center rounded-full bg-[rgba(28,26,23,0.7)] px-md py-[7px]">
              <AppIcon
                name={viewingInUse ? 'check_circle' : 'photo'}
                size={14}
                color={viewingInUse ? '#7FC49C' : '#D9B26A'}
              />
              <Text
                className={`font-mono-semibold text-[11px] ${viewingInUse ? 'text-[#7FC49C]' : 'text-gold-overline'}`}
              >
                {viewingInUse ? 'in use for try-ons' : 'saved'}
              </Text>
            </View>
          </View>
          {!viewing.cutoutUrl && (
            <Text className="text-center font-sans text-xs text-night-body">
              We couldn’t remove the background from this photo, so it’s shown as it is.
            </Text>
          )}
          {!viewingInUse && (
            <AppButton
              label="Use this photo for try-ons"
              variant="cream"
              icon="check"
              onPress={() => {
                selectionFeedback();
                select(viewing.id);
              }}
            />
          )}
          <AppButton
            label={deleteOne.isPending ? 'Deleting…' : 'Delete this photo'}
            variant="ghostDark"
            icon="delete"
            onPress={handleDeleteOne}
            disabled={deleteOne.isPending}
          />
          {deleteOne.isError && (
            <Text className="font-sans text-error" accessibilityRole="alert">
              Couldn’t delete the photo. Please try again.
            </Text>
          )}
        </FadeInView>
      )}

      {ordered.length > 0 && !selected && (
        <View className="mt-lg">
          <Text className="mb-sm font-mono text-[11px] uppercase tracking-[1.4px] text-neutral-400">
            Your photos · {ordered.length} of {MAX_MODEL_PHOTOS}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-sm">
              {ordered.map((photo, index) => {
                const inView = photo.id === viewing?.id && !showPicker;
                const inUse = photo.id === inUseId;
                return (
                  <Pressable
                    key={photo.id}
                    onPress={() => {
                      setAdding(false);
                      setViewingId(photo.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: inView }}
                    accessibilityLabel={`Photo ${index + 1}${inUse ? ', in use for try-ons' : ''}`}
                    className={`h-[96px] w-[72px] overflow-hidden rounded-[14px] border-2 ${inView ? 'border-cream' : 'border-transparent'}`}
                  >
                    <AppImage
                      uri={resolveMediaUrl(displayUrl(photo))}
                      accessibilityLabel=""
                      aspectRatio={3 / 4}
                      borderRadius={12}
                    />
                    {inUse && (
                      <View className="absolute right-[4px] top-[4px] h-[18px] w-[18px] items-center justify-center rounded-full bg-[#7FC49C]">
                        <AppIcon name="check" size={12} color="#12110F" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
              {!isFull && (
                <Pressable
                  onPress={() => {
                    upload.reset();
                    setAdding(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add a photo"
                  className={`h-[96px] w-[72px] items-center justify-center rounded-[14px] border-[1.5px] border-dashed ${showPicker ? 'border-cream' : 'border-[rgba(242,239,234,0.3)]'}`}
                >
                  <AppIcon name="add" size={26} color="#F2EFEA" />
                </Pressable>
              )}
            </View>
          </ScrollView>
          {isFull && (
            <Text className="mt-sm font-sans text-xs text-night-body">
              You have {MAX_MODEL_PHOTOS} photos. Delete one to add another.
            </Text>
          )}
        </View>
      )}

      {showPicker && (
        <View className="mt-xl gap-lg">
          {/* Onboarding showed the tips on the step before. */}
          {!inOnboarding && <PhotoTips />}
          <View className="aspect-[3/4] items-center justify-center overflow-hidden rounded-[26px] bg-[#1A1815]">
            <GoldBrackets />
            <AppIcon name="accessibility_new" size={64} color="rgba(242, 239, 234, 0.22)" />
            <View className="absolute bottom-[18px] flex-row items-center gap-[6px] rounded-full bg-[rgba(28,26,23,0.7)] px-md py-[7px]">
              <AppIcon name="center_focus_weak" size={14} color="#D9B26A" />
              <Text className="font-mono-semibold text-[11px] text-gold-overline">
                head to toe · stand straight
              </Text>
            </View>
          </View>
          <ImageSourcePicker
            dark
            onPickFromGallery={handlePickFromGallery}
            onOpenCamera={() => setShowCamera(true)}
          />
          {adding && ordered.length > 0 && (
            <AppButton label="Cancel" variant="ghostDark" onPress={() => setAdding(false)} />
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
            label="Save this photo"
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
            disabled={ordered.length === 0}
          />
        </View>
      )}

      {ordered.length > 0 && !selected && !inOnboarding && (
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

      <Text className="mt-xl text-center font-sans text-[11px] leading-[17px] text-neutral-400">
        Your photos are only used to create your try-ons. You can delete them at any time.
      </Text>
    </AppScaffold>
  );
}
