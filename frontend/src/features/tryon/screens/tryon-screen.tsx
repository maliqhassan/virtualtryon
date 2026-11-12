import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { IconButton } from '@/components/icon-button';
import { themeColors } from '@/constants/theme';
import { MY_PHOTO_HREF, displayUrl, useMyPhotoQuery } from '@/features/my-photo';
import { useSaveLookFromTryOn } from '@/features/saved-looks';
import { productHref, useProductQuery } from '@/features/shop';
import { CreditsPill, UPGRADE_HREF, USAGE_QUERY_KEY, useUsageQuery } from '@/features/usage';
import { useGarmentsQuery } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';
import { openExternalLink } from '@/lib/open-link';

import { GeneratingView } from '../components/generating-view';
import { ResultCanvas } from '../components/result-canvas';
import { useSaveToPhotos } from '../hooks/use-save-to-photos';
import { useStartTryOn } from '../hooks/use-start-tryon';
import { useTryOnJobQuery } from '../hooks/use-tryon-job-query';
import { TRY_ON_HOME_HREF, tryOnJobHref } from '../routes';
import { MissingPhotoError, TryOnLimitReachedError } from '../services/tryon-job';

const RING_HOLD_MS = 700;

/** Back to the existing Try-On tab (keeping its state), not a new copy of it. */
function goHome() {
  router.dismissTo(TRY_ON_HOME_HREF);
}

/**
 * One screen for a try-on's whole life: "generating" (a blurred portrait
 * and progress ring) while the job is queued/processing, then the light
 * result (handoff v2.1 change 6), or a failure. A failed try-on doesn't use
 * up the user's allowance; the server enforces that.
 */
export function TryOnScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const queryClient = useQueryClient();
  const jobQuery = useTryOnJobQuery(jobId ?? null);
  const photoQuery = useMyPhotoQuery();
  const garmentsQuery = useGarmentsQuery();
  const saveLook = useSaveLookFromTryOn();
  const savePhoto = useSaveToPhotos();
  const usage = useUsageQuery().data;
  const retry = useStartTryOn();
  const [compareMode, setCompareMode] = useState<'before' | 'after'>('after');

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

  // Which completed job's result is showing: set a moment after completion,
  // so the generating ring is seen reaching 100% first.
  // A job already finished when the screen opens (cached) shows straight away.
  const [revealedJobId, setRevealedJobId] = useState<string | null>(() =>
    job?.status === 'completed' ? job.id : null,
  );
  const completedId = job?.status === 'completed' ? job.id : null;
  useEffect(() => {
    if (!completedId) return;
    const timer = setTimeout(() => setRevealedJobId(completedId), RING_HOLD_MS);
    return () => clearTimeout(timer);
  }, [completedId]);

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

  // The ring stays up a moment at 100% once the job completes, so it visibly
  // finishes before the result appears.
  const pending = !job || job.status === 'queued' || job.status === 'processing';
  if (pending || (job.status === 'completed' && revealedJobId !== job.id)) {
    return (
      <GeneratingView
        status={job?.status}
        portraitUri={photoUrl ? resolveMediaUrl(photoUrl) : null}
        pieceTitle={garment?.title ?? null}
        timedOut={jobQuery.pollingTimedOut && job?.status !== 'completed'}
        onCheckAgain={() => void jobQuery.refetch()}
        onClose={goHome}
      />
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
  const resultUrl = job.generatedImageUrl ? resolveMediaUrl(job.generatedImageUrl) : null;
  const showingBefore = compareMode === 'before';
  // "Shop this piece": the store product's page, or the page it was pasted from.
  const shopPiece = job.productId
    ? () => router.push(productHref(job.productId as string))
    : storeUrl
      ? () => openExternalLink(storeUrl)
      : null;
  // Photos only after Looks has it, so a failed save never leaves a copy in
  // the library (and a retry doesn't add a second). Not on web: no library.
  const canSavePhoto = !!resultUrl && Platform.OS !== 'web';
  const savePhotoNow = () => {
    if (canSavePhoto && resultUrl) savePhoto.mutate(resultUrl);
  };
  const save = () => {
    if (saved || saveLook.isPending) return;
    saveLook.mutate(job.id, { onSuccess: savePhotoNow });
  };
  const photoRetry = savePhoto.data === 'denied' || savePhoto.isError;
  const photoNote =
    savePhoto.data === 'denied'
      ? 'Saved to Looks. Allow photo access in Settings to also save it to your photos.'
      : savePhoto.isError
        ? 'Saved to Looks, but it couldn’t be added to your photos.'
        : savePhoto.data === 'saved'
          ? 'Saved to Looks and your photos.'
          : null;

  return (
    <AppScaffold>
      <View className="flex-row items-center justify-between">
        <IconButton icon="arrow_back" accessibilityLabel="Back" onPress={goHome} />
        <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-primary">
          Your new look
        </Text>
        {usage ? <CreditsPill usage={usage} /> : <View className="w-[42px]" />}
      </View>

      <FadeInView key={compareMode} className="mt-[14px]">
        <ResultCanvas
          uri={showingBefore ? (photoUrl ? resolveMediaUrl(photoUrl) : null) : resultUrl}
          accessibilityLabel={showingBefore ? 'Your original photo' : 'Your try-on'}
          placeholderCaption={
            showingBefore ? '[ your original photo ]' : '[ result image not available ]'
          }
          tag={showingBefore ? 'Before' : undefined}
          bottomLeft={
            // The design's fit score ("91 · Suits you") needs result analysis,
            // which doesn't exist yet; the piece's name stands in, never a made-up number.
            <View className="flex-row items-center gap-[6px] self-start rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(28,26,23,0.55)] px-md py-[7px]">
              <AppIcon name="auto_awesome" size={15} color={themeColors.goldSoft} />
              <Text numberOfLines={1} className="flex-shrink font-sans-bold text-[12px] text-cream">
                {garment?.title ?? 'Your try-on'}
              </Text>
            </View>
          }
          bottomRight={
            <View className="flex-row gap-sm">
              <IconButton
                icon="send"
                tone="glass"
                accessibilityLabel="Share"
                onPress={handleShare}
              />
              <IconButton
                icon={showingBefore ? 'visibility_off' : 'visibility'}
                tone="glass"
                accessibilityLabel={showingBefore ? 'Show the try-on' : 'Show your original photo'}
                onPress={() => setCompareMode(showingBefore ? 'after' : 'before')}
              />
            </View>
          }
        />
      </FadeInView>

      <View className="mt-[14px] flex-row gap-md rounded-[18px] border border-callout-border bg-callout-bg px-lg py-[14px]">
        <AppIcon name="tips_and_updates" size={19} color={themeColors.primary} />
        <Text className="flex-1 font-sans text-[12.5px] leading-[19px] text-ink-body">
          {storeName ? `From ${storeName}. ` : ''}Tap the eye to compare with your original photo.
          Saved looks stay in Wardrobe → Outfits.
        </Text>
      </View>

      <View className="mt-[14px]">
        {/* Not `disabled` once saved: a disabled outlined button is drawn
            faded, and "Saved" should read as done, not unavailable. */}
        <AppButton
          variant={saved ? 'secondary' : 'primary'}
          icon={saved ? 'check_circle' : 'bookmark'}
          label={saved ? 'Saved' : saveLook.isPending ? 'Saving…' : 'Save'}
          onPress={save}
          disabled={saveLook.isPending}
          accessibilityLabel={saved ? 'Saved to Looks' : 'Save to Looks and your photos'}
        />
      </View>
      {saveLook.isError ? (
        <Text className="mt-sm text-center font-sans text-sm text-error" accessibilityRole="alert">
          Couldn’t save this look. Please try again.
        </Text>
      ) : (
        saved &&
        photoNote && (
          <View className="mt-sm items-center gap-xs">
            <Text
              className="text-center font-sans text-[12px] text-ink-secondary"
              accessibilityLiveRegion="polite"
            >
              {photoNote}
            </Text>
            {photoRetry && (
              <Pressable onPress={savePhotoNow} accessibilityRole="button" hitSlop={8}>
                <Text className="font-sans-bold text-[12.5px] text-primary">
                  {savePhoto.isPending ? 'Saving…' : 'Save to photos'}
                </Text>
              </Pressable>
            )}
          </View>
        )
      )}
      <View className="mt-[10px]">
        <AppButton label="Try a new outfit" variant="secondary" onPress={goHome} />
      </View>
      {shopPiece && (
        <Pressable
          onPress={shopPiece}
          accessibilityRole="link"
          hitSlop={8}
          className="mt-lg items-center"
        >
          <Text className="font-sans-bold text-[13px] text-primary">Shop this piece →</Text>
        </Pressable>
      )}
    </AppScaffold>
  );
}
