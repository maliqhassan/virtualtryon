import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { themeColors } from '@/constants/theme';
import { displayUrl, usePortraits } from '@/features/my-photo';
import { TRY_ON_HOME_HREF } from '@/features/tryon';
import { wardrobeTabHref } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/media-url';

const TILE_RATIO = 96 / 128;

/**
 * "My portraits" (handoff v2.1 change 3): an "Add portrait" tile, then the
 * user's photos, newest first. The one try-ons use carries the ink outline
 * and the "in use" tag. Tapping a photo makes it the one in use and opens
 * Try-On with it.
 */
export function PortraitsRail() {
  const { ordered, inUseId, select, addHref, isFull } = usePortraits();

  return (
    <View className="mt-xxl">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-sans-bold text-[17px] text-ink-primary" accessibilityRole="header">
          My portraits
        </Text>
        <Pressable
          onPress={() => router.push(wardrobeTabHref('portraits'))}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text className="font-sans-bold text-[12px] text-neutral-500">See all</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-xl mt-md"
        contentContainerClassName="gap-[9px] px-xl pb-xs"
      >
        <Pressable
          onPress={() => addHref && router.push(addHref)}
          disabled={!addHref}
          accessibilityRole="button"
          accessibilityLabel={isFull ? 'Manage your portraits' : 'Add a portrait'}
          className="h-[128px] w-[96px] items-center justify-center gap-xs rounded-[18px] border-[1.5px] border-dashed border-neutral-300 bg-surface"
        >
          <AppIcon name="add" size={28} color={themeColors.inkPrimary} />
          <Text className="font-sans-semibold text-[11px] text-ink-secondary">
            {isFull ? 'Manage' : 'Add portrait'}
          </Text>
        </Pressable>

        {ordered.map((photo, index) => {
          const inUse = photo.id === inUseId;
          return (
            <Pressable
              key={photo.id}
              onPress={() => {
                selectionFeedback();
                select(photo.id);
                router.push(TRY_ON_HOME_HREF);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Portrait ${index + 1}${inUse ? ', in use for try-ons' : ''}. Try something on with it`}
              className="h-[128px] w-[96px]"
            >
              <AppImage
                uri={resolveMediaUrl(displayUrl(photo))}
                accessibilityLabel=""
                aspectRatio={TILE_RATIO}
                borderRadius={18}
              />
              {inUse && (
                <>
                  <View
                    pointerEvents="none"
                    className="absolute inset-0 rounded-[18px] border-[2.5px] border-inverse"
                  />
                  <Text className="absolute bottom-[7px] left-[7px] overflow-hidden rounded-full bg-inverse px-[6px] py-[3px] font-mono-semibold text-[11px] text-ink-onPrimary">
                    in use
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
