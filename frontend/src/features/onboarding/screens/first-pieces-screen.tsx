import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';
import { useCreateGarment } from '@/features/wardrobe';
import { useImagePicker } from '@/hooks/use-image-picker';
import { validateImage } from '@/lib/images/validate-image';
import type { PickedImage } from '@/types';

import { OnboardingFrame } from '../components/onboarding-frame';
import { StepHeader } from '../components/step-header';
import { READY_HREF } from '../routes';

const TARGET = 5;
const MAX_PICKS = 20;

/**
 * Step 5 of 5: pick pieces from the camera roll, numbered in the order
 * chosen; they're added to the wardrobe. Skippable.
 */
export function FirstPiecesScreen() {
  const { pickManyFromGallery, fault } = useImagePicker();
  const createGarment = useCreateGarment();
  const [picked, setPicked] = useState<PickedImage[]>([]);
  const [skippedInvalid, setSkippedInvalid] = useState(0);
  const [progress, setProgress] = useState<{ done: number; failed: number } | null>(null);
  const [addedSoFar, setAddedSoFar] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const uploading = progress !== null;

  const openCameraRoll = async () => {
    const images = await pickManyFromGallery(MAX_PICKS - picked.length);
    const valid = images.filter((image) => validateImage(image) === null);
    setSkippedInvalid(images.length - valid.length);
    setFailedCount(0);
    setPicked((current) => [...current, ...valid].slice(0, MAX_PICKS));
  };

  const addAll = async () => {
    if (picked.length === 0) {
      router.push(READY_HREF);
      return;
    }
    let done = 0;
    const failed: PickedImage[] = [];
    setProgress({ done, failed: 0 });
    // One at a time: a phone upload of 20 photos in parallel stalls on slow networks.
    for (const image of picked) {
      try {
        await createGarment.mutateAsync({
          image,
          title: `Piece ${addedSoFar + done + 1}`,
          category: 'Other',
        });
        done += 1;
      } catch {
        failed.push(image);
      }
      setProgress({ done, failed: failed.length });
    }
    setAddedSoFar((n) => n + done);
    if (failed.length === 0) {
      router.push(READY_HREF);
      return;
    }
    // Keep only what failed, so trying again never adds a piece twice.
    setPicked(failed);
    setProgress(null);
    setFailedCount(failed.length);
  };

  const count = picked.length;
  const cta = uploading
    ? `Adding ${(progress?.done ?? 0) + (progress?.failed ?? 0) + 1} of ${count}…`
    : count
      ? `Add ${count} piece${count > 1 ? 's' : ''}`
      : 'Skip for now';

  return (
    <OnboardingFrame
      footer={
        <>
          <View className="mb-[10px] flex-row justify-between">
            <Text className="font-mono text-[11px] text-ink-secondary">
              {addedSoFar > 0 ? `${addedSoFar} added · ` : ''}
              {count} of {TARGET} selected
            </Text>
            <Pressable
              onPress={() => router.push(READY_HREF)}
              accessibilityRole="button"
              hitSlop={8}
              disabled={uploading}
            >
              <Text className="font-mono text-[11px] text-ink-secondary">skip for now →</Text>
            </Pressable>
          </View>
          <AppButton
            label={cta}
            variant="accent"
            icon="auto_awesome"
            onPress={addAll}
            disabled={uploading}
          />
        </>
      }
    >
      <StepHeader step={5} />
      <Text
        className="mt-[22px] font-display text-[32px] leading-[34px] text-ink-primary"
        accessibilityRole="header"
      >
        Pick five pieces{'\n'}you <Text className="font-display-italic">actually wear.</Text>
      </Text>
      <Text className="mt-sm font-sans text-[13px] leading-[20px] text-ink-secondary">
        From your camera roll. Tap a photo again to remove it. You can rename and sort them later.
      </Text>

      <View className="mt-[18px] flex-row flex-wrap gap-[6px]">
        <Pressable
          onPress={openCameraRoll}
          disabled={uploading || count >= MAX_PICKS}
          accessibilityRole="button"
          accessibilityLabel="Choose photos from your camera roll"
          className="aspect-square w-[32.3%] items-center justify-center gap-xs rounded-md"
          style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(22, 19, 15, 0.2)' }}
        >
          <AppIcon name="add_photo_alternate" size="lg" color={themeColors.inkSecondary} />
          <Text className="font-mono text-[9.5px] text-ink-secondary">camera roll</Text>
        </Pressable>
        {picked.map((image, index) => (
          <Pressable
            key={image.uri}
            onPress={() => setPicked((current) => current.filter((x) => x.uri !== image.uri))}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel={`Photo ${index + 1}, selected. Tap to remove.`}
            className="aspect-square w-[32.3%] overflow-hidden rounded-md"
            style={{ borderWidth: 2.5, borderColor: themeColors.inkPrimary }}
          >
            <Image source={{ uri: image.uri }} style={{ flex: 1 }} contentFit="cover" />
            <View className="absolute right-[6px] top-[6px] h-[22px] w-[22px] items-center justify-center rounded-full bg-inverse">
              <Text className="font-sans-bold text-[10px] text-surface">{index + 1}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {(fault || skippedInvalid > 0 || failedCount > 0) && !uploading && (
        <Text
          className="mt-md font-sans text-[12.5px] leading-[18px] text-error"
          accessibilityRole="alert"
        >
          {fault === 'permission_denied'
            ? 'Allow photo access in Settings to choose from your camera roll.'
            : failedCount > 0
              ? `${failedCount} photo${failedCount > 1 ? 's' : ''} couldn’t be added. Tap Add to try again, or skip.`
              : skippedInvalid > 0
                ? `${skippedInvalid} photo${skippedInvalid > 1 ? 's were' : ' was'} skipped: use JPEG or PNG under 10 MB.`
                : 'Couldn’t open your photos. Please try again.'}
        </Text>
      )}
    </OnboardingFrame>
  );
}
