import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { ThinkingIndicator } from '@/components/thinking-indicator';
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

/** Back to the existing Try On tab (keeping its state), not a new copy of it. */
function goHome() {
  router.dismissTo(TRY_ON_HOME_HREF);
}

/**
 * One screen for a try-on's whole life: "generating" while the job is
 * queued/processing, then the result (or a failure message). A failed
 * try-on doesn't use up the user's allowance; the server enforces that.
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
      await Share.share({ message: 'I tried this on with VirtualTryOn!' });
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
      <AppScaffold back>
        <Text className="font-display text-[34px] leading-[38px] text-ink-primary">
          Try-on not found
        </Text>
        <Text className="mt-xs text-ink-secondary">Start a new try-on from the home screen.</Text>
        <View className="mt-lg">
          <AppButton label="Go to Try On" onPress={goHome} />
        </View>
      </AppScaffold>
    );
  }

  if (!job || job.status === 'queued' || job.status === 'processing') {
    const step = !job
      ? 'Starting…'
      : job.status === 'queued'
        ? 'Waiting for a free spot…'
        : `Dressing you in ${garment?.title ?? 'your outfit'}…`;
    return (
      <AppScaffold back scroll={false}>
        <Text className="font-display text-[34px] leading-[38px] text-ink-primary">
          Creating your try-on
        </Text>
        <Text className="mt-xs text-ink-secondary">This usually takes less than a minute.</Text>

        <View className="mt-lg flex-row gap-md">
          <View className="flex-1">
            <AppImage
              uri={photoUrl ? resolveMediaUrl(photoUrl) : null}
              accessibilityLabel="Your photo"
              aspectRatio={3 / 4}
              borderRadius={12}
            />
          </View>
          <View className="flex-1">
            <AppImage
              uri={garment ? resolveMediaUrl(garment.imageUrl) : null}
              accessibilityLabel={garment?.title ?? 'Clothing item'}
              aspectRatio={3 / 4}
              borderRadius={12}
            />
          </View>
        </View>

        <View className="flex-1 items-center justify-center gap-lg">
          {jobQuery.pollingTimedOut ? (
            <View className="items-center gap-md px-lg">
              <Text className="text-center text-ink-secondary">
                This is taking longer than usual. Your try-on is still in the queue and will finish
                on its own.
              </Text>
              <AppButton
                label="Check again"
                variant="secondary"
                onPress={() => jobQuery.refetch()}
              />
            </View>
          ) : (
            <ThinkingIndicator step={step} />
          )}
        </View>
      </AppScaffold>
    );
  }

  if (job.status === 'failed') {
    return (
      <AppScaffold back>
        <Text className="font-display text-[34px] leading-[38px] text-ink-primary">
          That didn’t work
        </Text>
        <Text className="mt-xs text-ink-secondary" accessibilityRole="alert">
          We couldn’t create this try-on. It hasn’t been counted, so you can try again.
        </Text>
        <View className="mt-xl gap-md">
          <AppButton
            label={retry.isPending ? 'Starting…' : 'Try again'}
            onPress={handleRetry}
            disabled={retry.isPending}
          />
          <AppButton label="Back to Try On" variant="secondary" onPress={goHome} />
          {retry.error &&
            !(retry.error instanceof TryOnLimitReachedError) &&
            !(retry.error instanceof MissingPhotoError) && (
              <Text className="text-center text-sm text-error" accessibilityRole="alert">
                {retry.error.message}
              </Text>
            )}
        </View>
      </AppScaffold>
    );
  }

  const saved = saveLook.isSuccess;
  return (
    <AppScaffold back>
      <Text className="font-display text-[34px] leading-[38px] text-ink-primary">Your try-on</Text>
      {garment && <Text className="mt-xs text-ink-secondary">{garment.title}</Text>}
      {productQuery.data && (
        <Text className="mt-xxs text-xs font-bold uppercase tracking-widest text-primary">
          {productQuery.data.storeName}
        </Text>
      )}

      <View className="mt-lg">
        <CompareToggle mode={compareMode} onChange={setCompareMode} />
      </View>

      <FadeInView className="mt-md">
        {compareMode === 'after' ? (
          <ResultCanvas
            uri={job.generatedImageUrl ? resolveMediaUrl(job.generatedImageUrl) : null}
            placeholderCaption="Result image not available"
          />
        ) : (
          <ResultCanvas
            uri={photoUrl ? resolveMediaUrl(photoUrl) : null}
            placeholderCaption="Original photo not available"
            caption="Your original photo"
          />
        )}
      </FadeInView>

      <View className="mt-xl gap-md">
        <AppButton
          label={saved ? 'Saved to Looks' : saveLook.isPending ? 'Saving…' : 'Save to Looks'}
          onPress={() => saveLook.mutate(job.id)}
          disabled={saved || saveLook.isPending}
        />
        {saveLook.isError && (
          <Text className="text-center text-sm text-error" accessibilityRole="alert">
            Couldn’t save this look. Please try again.
          </Text>
        )}
        {storeUrl && (
          <AppButton
            label="View in store"
            variant="secondary"
            onPress={() => openExternalLink(storeUrl)}
          />
        )}
        <AppButton label="Try something else" variant="secondary" onPress={goHome} />
        <AppButton label="Share" variant="secondary" onPress={handleShare} />
      </View>
    </AppScaffold>
  );
}
