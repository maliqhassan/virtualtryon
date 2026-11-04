import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { NightGlow } from '@/components/gradient-fill';
import { FadeInView } from '@/components/fade-in-view';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { themeColors } from '@/constants/theme';
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
    <View className="mb-[10px] flex-row items-center gap-[9px]">
      <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-night-text">
        <Text className="font-sans-bold text-[11px] text-night">{step}</Text>
      </View>
      <Text className="font-sans-bold text-[13.5px] text-night-text">{title}</Text>
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
      <AppScaffold inTabs scroll={false} dark>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="font-display text-3xl text-night-text">Couldn’t connect</Text>
          <Text className="text-center font-sans text-sm text-night-body">
            Check your connection and try again.
          </Text>
          <AppButton
            label="Retry"
            variant="ghostDark"
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
    <AppScaffold inTabs dark>
      <View className="absolute -left-xl -right-xl -top-lg h-[460px]" pointerEvents="none">
        <NightGlow center={{ x: 0.5, y: 0 }} />
      </View>
      <ScreenHeader
        variant="editorial"
        dark
        eyebrow="Virtual fitting room"
        title="Try it"
        italic="on."
        italicInline
        right={usage ? <UsagePill usage={usage} dark /> : undefined}
      />

      {loading ? (
        <View className="gap-md">
          <Skeleton height={92} radius={20} dark />
          <Skeleton height={150} radius={20} dark />
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
              accessibilityLabel="Or try something from a store"
              containerClassName="mt-[10px]"
              className="flex-row items-center gap-[11px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-[14px] py-md"
            >
              <AppIcon name="storefront" size={19} color="#D9B26A" />
              <Text className="flex-1 font-sans-semibold text-[12.5px] text-night-text">
                Or try something from a store
              </Text>
              <AppIcon name="chevron_right" size="sm" color={themeColors.inkSecondary} />
            </PressableScale>
          </FadeInView>

          <FadeInView index={3} className="mt-xl">
            <SectionLabel step="3" title="Try it on" />
            <View className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-night-surface p-md">
              <View className="flex-row items-center gap-sm">
                {[
                  {
                    uri: photo ? resolveMediaUrl(displayUrl(photo)) : null,
                    label: 'you',
                    fit: 'contain' as const,
                  },
                  {
                    uri: selectedGarment ? resolveMediaUrl(selectedGarment.imageUrl) : null,
                    label: selectedGarment?.title ?? 'Pick a piece',
                    fit: 'cover' as const,
                  },
                ].map((slot, index) => (
                  <Fragment key={slot.label}>
                    {index === 1 && <AppIcon name="add" size="md" color={themeColors.goldSoft} />}
                    <View className="flex-1">
                      <AppImage
                        uri={slot.uri}
                        accessibilityLabel={slot.label}
                        aspectRatio={3 / 4}
                        borderRadius={14}
                        placeholderText={slot.label}
                        fit={slot.fit}
                      />
                      <Text
                        numberOfLines={1}
                        className="mt-xs font-mono text-[9px] text-neutral-500"
                      >
                        {slot.label}
                      </Text>
                    </View>
                  </Fragment>
                ))}
              </View>
              <View className="mt-md">
                {outOfTryOns ? (
                  <AppButton
                    label="Get more try-ons"
                    variant="accent"
                    onPress={() => router.push(UPGRADE_HREF)}
                  />
                ) : (
                  <AppButton
                    variant="accent"
                    icon="auto_awesome"
                    label={startTryOn.isPending ? 'Starting…' : 'Try it on'}
                    onPress={handleTryOn}
                    disabled={!ready || startTryOn.isPending}
                  />
                )}
              </View>
              <Text className="mt-[9px] text-center font-sans text-[11px] text-ink-secondary">
                {!outOfTryOns && !ready
                  ? !photo
                    ? 'Add your photo first.'
                    : 'Pick a piece above.'
                  : 'Failed try-ons never count against your allowance.'}
              </Text>
              {showStartError && (
                <Text
                  className="mt-sm text-center font-sans text-sm text-error"
                  accessibilityRole="alert"
                >
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
