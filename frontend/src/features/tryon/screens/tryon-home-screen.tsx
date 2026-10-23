import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ShopIcon } from '@/components/tab-icons';
import { MY_PHOTO_HREF, displayUrl, useMyPhotosQuery } from '@/features/my-photo';
import { SHOP_HREF } from '@/features/shop';
import { UPGRADE_HREF, UsagePill, useUsageQuery } from '@/features/usage';
import { addGarmentHref, useGarmentsQuery } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';

import { GarmentPicker } from '../components/garment-picker';
import { YouCard } from '../components/you-card';
import { useStartTryOn } from '../hooks/use-start-tryon';
import { tryOnJobHref } from '../routes';
import { MissingPhotoError, TryOnLimitReachedError } from '../services/tryon-job';

function SectionLabel({ step, title }: { step: string; title: string }) {
  return (
    <View className="mb-sm flex-row items-center gap-sm">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-inverse">
        <Text className="text-[11px] font-bold text-white">{step}</Text>
      </View>
      <Text className="text-sm font-bold text-ink-primary">{title}</Text>
    </View>
  );
}

/**
 * Home tab. Three steps, no typing: your photo (saved once), pick a piece
 * from your wardrobe (or browse stores), tap "Try it on". The server holds
 * every rule (photo required, plan allowance); this screen reflects them.
 */
export function TryOnHomeScreen() {
  const photoQuery = useMyPhotosQuery();
  // Set when another screen sends a piece here to try on (wardrobe's
  // tryOnGarmentHref); `at` is unique per request, so a newer request wins
  // over a piece picked earlier on this (always mounted) tab.
  const params = useLocalSearchParams<{ selected?: string; at?: string }>();
  const garmentsQuery = useGarmentsQuery();
  const usageQuery = useUsageQuery();
  const startTryOn = useStartTryOn();
  const [pick, setPick] = useState<{ garmentId: string; request?: string } | null>(null);
  const pickIsNewer = !!pick && pick.request === params.at;
  const selectedGarmentId = pickIsNewer
    ? pick.garmentId
    : (params.selected ?? pick?.garmentId ?? null);

  const photos = photoQuery.data ?? [];
  const photo = photos.find((p) => p.angle === 'front') ?? null;
  const garments = garmentsQuery.data ?? [];
  const selectedGarment = garments.find((g) => g.id === selectedGarmentId) ?? null;
  const usage = usageQuery.data;
  const outOfTryOns = !!usage && usage.remaining <= 0;

  const handleTryOn = useCallback(() => {
    if (!selectedGarment) return;
    startTryOn.mutate(
      { garmentId: selectedGarment.id },
      {
        onSuccess: (job) => router.push(tryOnJobHref(job.id)),
        onError: (error) => {
          if (error instanceof TryOnLimitReachedError) router.push(UPGRADE_HREF);
          else if (error instanceof MissingPhotoError) router.push(MY_PHOTO_HREF);
        },
      },
    );
  }, [selectedGarment, startTryOn]);

  if (photoQuery.isError || garmentsQuery.isError) {
    return (
      <AppScaffold inTabs scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="font-display text-3xl text-ink-primary">Couldn’t connect</Text>
          <Text className="text-center text-sm text-ink-secondary">
            Check your connection and try again.
          </Text>
          <AppButton
            label="Retry"
            variant="secondary"
            onPress={() => {
              photoQuery.refetch();
              garmentsQuery.refetch();
            }}
          />
        </View>
      </AppScaffold>
    );
  }

  const loading = photoQuery.isLoading || garmentsQuery.isLoading;
  const showStartError =
    startTryOn.error &&
    !(startTryOn.error instanceof TryOnLimitReachedError) &&
    !(startTryOn.error instanceof MissingPhotoError);
  const ready = !!photo && !!selectedGarment;

  return (
    <AppScaffold inTabs>
      <ScreenHeader
        eyebrow="Virtual fitting room"
        title="Try on"
        subtitle="See any piece on you before you wear it or buy it."
        right={usage ? <UsagePill usage={usage} /> : undefined}
      />

      {loading ? (
        <View className="gap-md">
          <Skeleton height={92} radius={20} />
          <Skeleton height={150} radius={20} />
        </View>
      ) : (
        <>
          <FadeInView index={1}>
            <SectionLabel step="1" title="Your photo" />
            <YouCard photos={photos} />
          </FadeInView>

          <FadeInView index={2} className="mt-xl">
            <SectionLabel step="2" title="Choose a piece" />
            <GarmentPicker
              garments={garments}
              selectedId={selectedGarmentId}
              onSelect={(garment) => setPick({ garmentId: garment.id, request: params.at })}
              onAdd={() => router.push(addGarmentHref({ returnToTryOn: true }))}
            />
            <PressableScale
              onPress={() => router.push(SHOP_HREF)}
              accessibilityRole="button"
              accessibilityLabel="Browse stores"
              containerClassName="mt-md"
              className="flex-row items-center gap-md rounded-xxl border border-border bg-surface p-md"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                <ShopIcon color="#B4713F" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-ink-primary">Browse stores</Text>
                <Text className="text-xs text-ink-secondary">
                  Try on clothes before you buy them
                </Text>
              </View>
              <Text className="text-lg text-primary">›</Text>
            </PressableScale>
          </FadeInView>

          <FadeInView index={3} className="mt-xl">
            <SectionLabel step="3" title="Try it on" />
            <View className="rounded-[24px] bg-inverse p-lg">
              <View className="flex-row gap-md">
                {[
                  {
                    uri: photo ? resolveMediaUrl(displayUrl(photo)) : null,
                    label: 'Your photo',
                    fit: 'contain' as const,
                  },
                  {
                    uri: selectedGarment ? resolveMediaUrl(selectedGarment.imageUrl) : null,
                    label: selectedGarment?.title ?? 'Pick a piece',
                    fit: 'cover' as const,
                  },
                ].map((slot) => (
                  <View key={slot.label} className="flex-1">
                    <AppImage
                      uri={slot.uri}
                      accessibilityLabel={slot.label}
                      aspectRatio={3 / 4}
                      borderRadius={14}
                      placeholderText={slot.label}
                      fit={slot.fit}
                    />
                    <Text numberOfLines={1} className="mt-xs text-xs text-neutral-300">
                      {slot.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="mt-lg">
                {outOfTryOns ? (
                  <AppButton label="Get more try-ons" onPress={() => router.push(UPGRADE_HREF)} />
                ) : (
                  <AppButton
                    label={startTryOn.isPending ? 'Starting…' : 'Try it on'}
                    onPress={handleTryOn}
                    disabled={!ready || startTryOn.isPending}
                  />
                )}
              </View>
              {!outOfTryOns && !ready && (
                <Text className="mt-sm text-center text-xs text-neutral-300">
                  {!photo ? 'Add your photo first.' : 'Pick a piece above.'}
                </Text>
              )}
              {showStartError && (
                <Text className="mt-sm text-center text-sm text-error" accessibilityRole="alert">
                  {startTryOn.error?.message}
                </Text>
              )}
            </View>
          </FadeInView>
        </>
      )}
    </AppScaffold>
  );
}
