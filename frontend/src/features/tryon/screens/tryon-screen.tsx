import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { BreathingOrb } from '@/components/breathing-orb';
import { FadeInView } from '@/components/fade-in-view';
import { NightGlow } from '@/components/gradient-fill';
import { IconButton } from '@/components/icon-button';
import { themeColors } from '@/constants/theme';
import { MY_PHOTO_HREF, displayUrl, useMyPhotoQuery } from '@/features/my-photo';
import { useSaveLookFromTryOn } from '@/features/saved-looks';
import { useProductQuery } from '@/features/shop';
import { UPGRADE_HREF, USAGE_QUERY_KEY } from '@/features/usage';
import { useGarmentsQuery } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';
import { openExternalLink } from '@/lib/open-link';

import { CompareToggle, type CompareMode } from '../components/compare-toggle';
import { ResultCanvas } from '../components/result-canvas';
import { useStartTryOn } from '../hooks/use-start-tryon';
import { useTryOnJobQuery } from '../hooks/use-tryon-job-query';
import { TRY_ON_HOME_HREF, tryOnJobHref } from '../routes';
import { MissingPhotoError, TryOnLimitReachedError } from '../services/tryon-job';

/** Back to the existing Try-On tab (keeping its state), not a new copy of it. */
function goHome() {
  router.dismissTo(TRY_ON_HOME_HREF);
}

/**
 * One screen for a try-on's whole life, on the dark stage: "generating"
 * while the job is queued/processing, then the result (or a failure). A
 * failed try-on doesn't use up the user's allowance; the server enforces that.
 */
export function TryOnScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const queryClient = useQueryClient();
  const jobQuery = useTryOnJobQuery(jobId ?? null);
  const photoQuery = useMyPhotoQuery();
  const garmentsQuery = useGarmentsQuery();
  const saveLook = useSaveLookFromTryOn();
  const retry = useStartTryOn();
  const [compareMode, setCompareMode] = useState<CompareMode>('after');

  const job = jobQuery.data ?? null;
  const productQuery = useProductQuery(job?.productId);
  // The clothing this try-on used: a wardrobe piece or a store product.
  const wardrobeGarment = garmentsQuery.data?.find((g) => g.id === job?.garmentId);
  const garment =
    wardrobeGarment ??
    (productQuery.data
      ? { title: productQuery.data.title, imageUrl: productQuery.data.imageUrl }
      : null);
  const storeName = wardrobeGarment?.sourceStore ?? productQuery.data?.storeName ?? null;
  // Where to buy it: the page it was pasted from, or the sample product's link.
  const storeUrl = wardrobeGarment?.sourceUrl ?? productQuery.data?.productUrl ?? null;
  // The photo this try-on used, falling back to the current one while loading.
  const photoUrl = job?.userImageUrl ?? (photoQuery.data ? displayUrl(photoQuery.data) : null);
  const finished = job?.status === 'completed' || job?.status === 'failed';

  // A finished job changes the remaining count (a failure gives the try-on back).
  useEffect(() => {
    if (finished) queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY });
  }, [finished, queryClient]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: 'I tried this on with AI Stylist!' });
    } catch {
      // Share sheet dismissed — not an error.
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (!job?.garmentId) return goHome();
    retry.mutate(
      { garmentId: job.garmentId },
      {
        onSuccess: (newJob) => router.replace(tryOnJobHref(newJob.id)),
        onError: (error) => {
          if (error instanceof TryOnLimitReachedError) router.push(UPGRADE_HREF);
          else if (error instanceof MissingPhotoError) router.push(MY_PHOTO_HREF);
        },
      },
    );
  }, [job, retry]);

  if (!jobId || jobQuery.isError) {
    return (
      <AppScaffold back dark>
        <Text className="font-display text-[34px] leading-[38px] text-night-text">
          Try-on not found
        </Text>
        <Text className="mt-xs font-sans text-night-body">
          Start a new try-on from the Try-On tab.
        </Text>
        <View className="mt-lg">
          <AppButton label="Go to Try-On" variant="cream" onPress={goHome} />
        </View>
      </AppScaffold>
    );
  }

  if (!job || job.status === 'queued' || job.status === 'processing') {
    const step = !job
      ? 'Starting your try-on'
      : job.status === 'queued'
        ? 'Waiting for a free spot'
        : 'Draping fabric to your frame';
    const stepNumber = !job ? 1 : job.status === 'queued' ? 1 : 2;
    return (
      <View className="flex-1 bg-night">
        <NightGlow center={{ x: 0.5, y: 0.4 }} />
        <AppScaffold dark scroll={false}>
          <View className="self-start">
            <IconButton icon="close" tone="glass" accessibilityLabel="Close" onPress={goHome} />
          </View>
          <Text
            className="mt-lg font-display text-[32px] leading-[34px] text-cream"
            accessibilityRole="header"
          >
            Dressing you in{'\n'}
            <Text className="font-display-italic text-gold-soft">
              {garment?.title ?? 'your outfit'}
            </Text>
          </Text>
          <View className="mt-[22px] flex-row gap-[10px] opacity-70">
            <View className="flex-1">
              <AppImage
                uri={photoUrl ? resolveMediaUrl(photoUrl) : null}
                accessibilityLabel="Your photo"
                aspectRatio={3 / 4}
                borderRadius={18}
                placeholderText=" "
              />
            </View>
            <View className="flex-1">
              <AppImage
                uri={garment ? resolveMediaUrl(garment.imageUrl) : null}
                accessibilityLabel={garment?.title ?? 'Clothing item'}
                aspectRatio={3 / 4}
                borderRadius={18}
                placeholderText=" "
              />
            </View>
          </View>

          <View
            className="flex-1 items-center justify-center gap-lg"
            accessibilityLiveRegion="polite"
          >
            {jobQuery.pollingTimedOut ? (
              <View className="items-center gap-md px-lg">
                <Text className="text-center font-sans text-night-body">
                  This is taking longer than usual. Your try-on is still in the queue and will
                  finish on its own.
                </Text>
                <AppButton
                  label="Check again"
                  variant="ghostDark"
                  onPress={() => jobQuery.refetch()}
                />
              </View>
            ) : (
              <>
                <BreathingOrb size={84} />
                <Text className="font-sans-semibold text-[13.5px] text-night-text">{step}</Text>
                <Text className="font-mono text-[10.5px] text-neutral-500">
                  step {stepNumber} of 3 · usually under a minute
                </Text>
              </>
            )}
          </View>
        </AppScaffold>
      </View>
    );
  }

  if (job.status === 'failed') {
    return (
      <AppScaffold back dark>
        <Text className="font-display text-[34px] leading-[38px] text-night-text">
          That didn’t work
        </Text>
        <Text className="mt-xs font-sans text-night-body" accessibilityRole="alert">
          We couldn’t create this try-on. It hasn’t been counted, so you can try again.
        </Text>
        <View className="mt-xl gap-md">
          <AppButton
            variant="accent"
            icon="auto_awesome"
            label={retry.isPending ? 'Starting…' : 'Try again'}
            onPress={handleRetry}
            disabled={retry.isPending}
          />
          <AppButton label="Back to Try-On" variant="ghostDark" onPress={goHome} />
          {retry.error &&
            !(retry.error instanceof TryOnLimitReachedError) &&
            !(retry.error instanceof MissingPhotoError) && (
              <Text className="text-center font-sans text-sm text-error" accessibilityRole="alert">
                {retry.error.message}
              </Text>
            )}
        </View>
      </AppScaffold>
    );
  }

  const saved = saveLook.isSuccess;
  return (
    <AppScaffold dark>
      <View className="flex-row items-center justify-between">
        <IconButton icon="arrow_back" tone="glass" accessibilityLabel="Back" onPress={goHome} />
        <CompareToggle mode={compareMode} onChange={setCompareMode} />
        <IconButton
          icon="ios_share"
          tone="glass"
          accessibilityLabel="Share"
          onPress={handleShare}
        />
      </View>

      <FadeInView key={compareMode} className="mt-[14px]">
        {compareMode === 'after' ? (
          <ResultCanvas
            uri={job.generatedImageUrl ? resolveMediaUrl(job.generatedImageUrl) : null}
            placeholderCaption="[ result image not available ]"
            overlay={
              <View className="rounded-xxl border border-[rgba(255,255,255,0.12)] bg-[rgba(28,26,23,0.72)] px-lg py-[14px]">
                <View className="flex-row items-center gap-sm">
                  <AppIcon name="auto_awesome" size={16} color={themeColors.goldSoft} />
                  <Text
                    className="flex-1 font-sans-bold text-[13.5px] text-cream"
                    numberOfLines={1}
                  >
                    {garment?.title ?? 'Your try-on'}
                  </Text>
                </View>
                <Text className="mt-[6px] font-sans text-[12px] leading-[18px] text-night-body">
                  {storeName ? `From ${storeName}. ` : ''}Save it to compare later, or flip to
                  Before to see your original photo.
                </Text>
              </View>
            }
          />
        ) : (
          <ResultCanvas
            uri={photoUrl ? resolveMediaUrl(photoUrl) : null}
            placeholderCaption="[ your original photo ]"
          />
        )}
      </FadeInView>

      <View className="mt-[14px]">
        <AppButton
          variant={saved ? 'saved' : 'accent'}
          icon={saved ? 'check_circle' : 'bookmark'}
          label={saved ? 'Saved to Looks' : saveLook.isPending ? 'Saving…' : 'Save to Looks'}
          onPress={() => saveLook.mutate(job.id)}
          disabled={saved || saveLook.isPending}
        />
      </View>
      {saveLook.isError && (
        <Text className="mt-sm text-center font-sans text-sm text-error" accessibilityRole="alert">
          Couldn’t save this look. Please try again.
        </Text>
      )}
      <View className="mt-[9px] flex-row gap-[9px]">
        {storeUrl && (
          <View className="flex-1">
            <AppButton
              label="View in store"
              variant="ghostDark"
              onPress={() => openExternalLink(storeUrl)}
            />
          </View>
        )}
        <View className="flex-1">
          <AppButton label="Try another" variant="ghostDark" onPress={goHome} />
        </View>
      </View>
    </AppScaffold>
  );
}
