import BottomSheet, {
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
// Gesture Handler's ScrollView, so sideways swipes on the chips scroll them
// instead of being taken by the sheet's drag.
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/skeleton';
import { themeColors } from '@/constants/theme';
import { MY_PHOTO_HREF, displayUrl, useMyPhotoQuery } from '@/features/my-photo';
import { useOnboardingPreferences } from '@/features/onboarding';
import { type Audience, type Occasion, useCollectionQuery } from '@/features/shop';
import { UPGRADE_HREF, useUsageQuery } from '@/features/usage';
import { addGarmentHref, useGarmentsQuery } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/media-url';

import { AddPieceTile, type Piece, PieceTile } from '../components/piece-tile';
import { StudioPortrait } from '../components/studio-portrait';
import { useStartTryOn } from '../hooks/use-start-tryon';
import { tryOnJobHref } from '../routes';
import { MissingPhotoError, TryOnLimitReachedError } from '../services/tryon-job';

type Tab = 'collections' | 'mine';
type StudioAudience = Exclude<Audience, 'unisex'>;

const TABS = [
  { value: 'collections', label: 'Collections' },
  { value: 'mine', label: 'My clothes' },
] as const;
const CHIPS: { value: Occasion | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'casual', label: 'Casual' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'office', label: 'Office' },
  { value: 'wedding', label: 'Wedding' },
];
// The sheet rests at 55% and pulls up to 88%; the portrait shows above it.
const SNAP_POINTS = ['55%', '88%'];
// How far the sheet's rounded top overlaps the portrait.
const SHEET_OVERLAP = 26;

/**
 * Try-On studio (handoff v2.1 change 4): the portrait on top, a bottom
 * sheet below with Collections (store pieces by Men/Women and occasion) and
 * My clothes, and one Try it on button. The tab bar is hidden here
 * (components/floating-tab-bar.tsx). Starting a try-on and its errors are
 * the same as before: useStartTryOn, then the job screen.
 */
export function TryOnStudioScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Set when another screen sends a piece here (wardrobe's tryOnGarmentHref);
  // `at` is unique per request, so a newer request wins over an earlier pick.
  const params = useLocalSearchParams<{ selected?: string; at?: string }>();
  const styleFor = useOnboardingPreferences((state) => state.styleFor);

  const photoQuery = useMyPhotoQuery();
  const garmentsQuery = useGarmentsQuery();
  const usage = useUsageQuery().data;
  const startTryOn = useStartTryOn();

  // A piece sent here opens My clothes, where it is; after that, the
  // user's own tab choice wins until the next request (same `at` rule).
  const [tabPick, setTabPick] = useState<{ tab: Tab; request?: string } | null>(null);
  const tab: Tab =
    tabPick && (tabPick.request === params.at || !params.selected)
      ? tabPick.tab
      : params.selected
        ? 'mine'
        : 'collections';
  const setTab = (next: Tab) => setTabPick({ tab: next, request: params.at });
  // Follows the saved "style for" (which may load a moment after this
  // screen) until the user flips the toggle.
  const [audiencePick, setAudience] = useState<StudioAudience | null>(null);
  const audience = audiencePick ?? styleFor;
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [pick, setPick] = useState<{ piece: Piece | null; request?: string } | null>(null);
  const collectionQuery = useCollectionQuery(audience, occasion);

  const garments = garmentsQuery.data ?? [];
  const mine: Piece[] = garments.map((g) => ({
    kind: 'garment',
    id: g.id,
    title: g.title,
    imageUrl: g.imageUrl,
  }));
  const collection: Piece[] = (collectionQuery.data ?? []).map((p) => ({
    kind: 'product',
    id: p.id,
    title: p.title,
    imageUrl: p.imageUrl,
  }));
  const sentHere = params.selected ? (mine.find((p) => p.id === params.selected) ?? null) : null;
  const piece = pick && (pick.request === params.at || !sentHere) ? pick.piece : sentHere;

  const photo = photoQuery.data ?? null;
  // Every try-on uses the front portrait: without one, don't send a request
  // that can only fail.
  const needsPortrait = photoQuery.isSuccess && !photo;
  const outOfTryOns = !!usage && usage.remaining <= 0;

  const toggle = (next: Piece) =>
    setPick({
      piece: piece?.kind === next.kind && piece.id === next.id ? null : next,
      request: params.at,
    });
  const isPicked = (candidate: Piece) =>
    piece?.kind === candidate.kind && piece.id === candidate.id;

  const tryOn = () => {
    if (!piece) return;
    startTryOn.mutate(
      piece.kind === 'garment' ? { garmentId: piece.id } : { productId: piece.id },
      {
        onSuccess: (job) => router.push(tryOnJobHref(job.id)),
        onError: (error) => {
          if (error instanceof TryOnLimitReachedError) router.push(UPGRADE_HREF);
          else if (error instanceof MissingPhotoError) router.push(MY_PHOTO_HREF);
        },
      },
    );
  };
  const startError =
    startTryOn.error &&
    !(startTryOn.error instanceof TryOnLimitReachedError) &&
    !(startTryOn.error instanceof MissingPhotoError)
      ? startTryOn.error.message
      : null;

  const renderFooter = (props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props}>
      <View
        className="border-t border-border bg-surface px-[18px] pt-md"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
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
            label={
              startTryOn.isPending ? 'Starting…' : piece ? 'Try it on' : 'Pick a piece to try on'
            }
            onPress={tryOn}
            disabled={!piece || needsPortrait || startTryOn.isPending}
          />
        )}
        <Text
          className={`mt-sm text-center font-sans text-[11px] ${startError ? 'text-error' : 'text-ink-secondary'}`}
          accessibilityRole={startError ? 'alert' : undefined}
        >
          {startError ??
            (needsPortrait ? 'Add your portrait first' : '1 credit · refunded if it fails')}
        </Text>
      </View>
    </BottomSheetFooter>
  );

  const portraitHeight = height * 0.45 + SHEET_OVERLAP;
  const gridQuery = tab === 'mine' ? garmentsQuery : collectionQuery;
  const loadingGrid = gridQuery.isLoading;
  const pieces = tab === 'mine' ? mine : collection;

  return (
    <View className="flex-1 bg-background">
      <StudioPortrait
        height={portraitHeight}
        portraitUri={photo ? resolveMediaUrl(displayUrl(photo)) : null}
        piece={piece}
        usage={usage}
      />

      <BottomSheet
        index={0}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        footerComponent={renderFooter}
        backgroundStyle={{
          backgroundColor: themeColors.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
        handleIndicatorStyle={{ backgroundColor: themeColors.neutral300, width: 40 }}
        style={{ boxShadow: '0px -8px 24px rgba(22, 19, 15, 0.08)' }}
      >
        <View className="px-[18px] pb-md">
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        </View>
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 120 }}
        >
          {tab === 'collections' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="items-center gap-[7px] pb-xs"
            >
              <Pressable
                onPress={() => {
                  selectionFeedback();
                  setAudience(audience === 'men' ? 'women' : 'men');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Showing ${audience}'s pieces. Switch`}
                className="flex-row items-center gap-[5px] rounded-full bg-inverse py-sm pl-sm pr-md"
              >
                <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-background">
                  <AppIcon
                    name={audience === 'men' ? 'male' : 'female'}
                    size={15}
                    color={themeColors.inkPrimary}
                  />
                </View>
                <Text className="font-sans-bold text-[12px] text-ink-onPrimary">
                  {audience === 'men' ? 'Men' : 'Women'}
                </Text>
              </Pressable>
              <View className="h-[20px] w-px bg-neutral-200" />
              {CHIPS.map((chip) => {
                const on = chip.value === occasion;
                return (
                  <Pressable
                    key={chip.label}
                    onPress={() => {
                      selectionFeedback();
                      setOccasion(chip.value);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    className={`rounded-full px-[14px] py-[9px] ${on ? 'bg-inverse' : 'bg-muted'}`}
                  >
                    <Text
                      className={`font-sans-semibold text-[12.5px] ${on ? 'text-ink-onPrimary' : 'text-ink-primary'}`}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View
            className={`flex-row flex-wrap gap-x-[2.75%] gap-y-[12px] ${tab === 'collections' ? 'mt-md' : ''}`}
          >
            {tab === 'mine' && (
              <AddPieceTile onPress={() => router.push(addGarmentHref({ returnToTryOn: true }))} />
            )}
            {loadingGrid
              ? [0, 1, 2].map((n) => (
                  <View key={n} className="w-[31.5%]">
                    <Skeleton aspectRatio={3 / 4} radius={16} />
                  </View>
                ))
              : pieces.map((candidate) => (
                  <PieceTile
                    key={`${candidate.kind}-${candidate.id}`}
                    piece={candidate}
                    selected={isPicked(candidate)}
                    onToggle={toggle}
                  />
                ))}
          </View>
          {gridQuery.isError ? (
            <View className="mt-lg items-center gap-sm">
              <Text className="text-center font-sans text-[12.5px] text-ink-secondary">
                Couldn’t load these. Check your connection.
              </Text>
              <Pressable
                onPress={() => void gridQuery.refetch()}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text className="font-sans-bold text-[13px] text-primary">Retry</Text>
              </Pressable>
            </View>
          ) : (
            !loadingGrid &&
            tab === 'collections' &&
            pieces.length === 0 && (
              <Text className="mt-lg text-center font-sans text-[12.5px] text-ink-secondary">
                {occasion
                  ? 'Nothing here for this occasion yet. Try another.'
                  : 'No store pieces here yet.'}
              </Text>
            )
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
