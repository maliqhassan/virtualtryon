import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppScaffold } from '@/components/app-scaffold';
import { IconButton } from '@/components/icon-button';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { PortraitsGrid } from '@/features/my-photo';
import { SavedLooksList } from '@/features/saved-looks';

import { ClothesTab } from '../components/clothes-tab';
import { useGarmentsQuery } from '../hooks/use-garments-query';
import { ADD_GARMENT_HREF, type WardrobeTab } from '../routes';

const TABS = [
  { value: 'outfits', label: 'Outfits' },
  { value: 'portraits', label: 'Portraits' },
  { value: 'clothes', label: 'Clothes' },
] as const;

function isTab(value: unknown): value is WardrobeTab {
  return TABS.some((t) => t.value === value);
}

/**
 * Wardrobe (handoff v2.1 change 7): Outfits (saved try-ons), Portraits
 * (the user's photos) and Clothes (the closet grid). The tab lives in the
 * URL (`?tab=outfits`), so other screens can link straight to one.
 */
export function WardrobeScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: WardrobeTab = isTab(params.tab) ? params.tab : 'clothes';
  // The count only once known: never "0 pieces" while loading or offline.
  const pieceCount = useGarmentsQuery().data?.length;

  return (
    <AppScaffold inTabs scroll={false}>
      <ScreenHeader
        eyebrow={
          pieceCount === undefined
            ? 'Your wardrobe'
            : `${pieceCount} ${pieceCount === 1 ? 'piece' : 'pieces'} you own`
        }
        title="Wardrobe"
        right={
          tab === 'clothes' ? (
            <IconButton
              icon="add"
              tone="ink"
              accessibilityLabel="Add a piece"
              onPress={() => router.push(ADD_GARMENT_HREF)}
            />
          ) : undefined
        }
      />
      <View className="mb-lg">
        <SegmentedControl
          options={TABS}
          value={tab}
          onChange={(next) => router.setParams({ tab: next })}
        />
      </View>
      <View className="flex-1">
        {tab === 'outfits' && <SavedLooksList />}
        {tab === 'portraits' && <PortraitsGrid />}
        {tab === 'clothes' && <ClothesTab />}
      </View>
    </AppScaffold>
  );
}
