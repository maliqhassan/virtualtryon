import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { themeColors } from '@/constants/theme';
import {
  MY_PHOTO_HREF,
  PHOTO_ANGLES,
  addPortraitHref,
  displayUrl,
  useMyPhotosQuery,
} from '@/features/my-photo';
import { TRY_ON_HOME_HREF } from '@/features/tryon';
import { WARDROBE_HREF } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';

const TILE_RATIO = 96 / 128;

/**
 * "My portraits" (handoff v2.1 change 3): an "Add portrait" tile, then the
 * user's photos. The front one is what every try-on uses, so it carries the
 * ink outline and the "in use" tag. Tapping a photo opens Try-On.
 */
export function PortraitsRail() {
  const photos = useMyPhotosQuery().data ?? [];
  // Front first, then side and back, as on My photo.
  const ordered = PHOTO_ANGLES.flatMap(({ angle }) => photos.filter((p) => p.angle === angle));
  // "Add" fills the first missing view, never silently replacing the front
  // photo in use. With all three added it opens My photo to choose.
  const missing = PHOTO_ANGLES.find(({ angle }) => !photos.some((p) => p.angle === angle));
  const addHref = missing ? addPortraitHref(missing.angle) : MY_PHOTO_HREF;

  return (
    <View className="mt-[22px]">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-sans-bold text-[17px] text-ink-primary" accessibilityRole="header">
          My portraits
        </Text>
        <Pressable onPress={() => router.push(WARDROBE_HREF)} accessibilityRole="link" hitSlop={8}>
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
          onPress={() => router.push(addHref)}
          accessibilityRole="button"
          accessibilityLabel="Add a portrait"
          className="h-[128px] w-[96px] items-center justify-center gap-xs rounded-[18px] border-[1.5px] border-dashed border-neutral-300 bg-surface"
        >
          <AppIcon name="add" size={28} color={themeColors.inkPrimary} />
          <Text className="font-sans-semibold text-[11px] text-ink-secondary">Add portrait</Text>
        </Pressable>

        {ordered.map((photo) => {
          const inUse = photo.angle === 'front';
          return (
            <Pressable
              key={photo.id}
              onPress={() => router.push(TRY_ON_HOME_HREF)}
              accessibilityRole="button"
              accessibilityLabel={`${photo.angle} portrait${inUse ? ', in use for try-ons' : ''}. Try something on`}
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
                  <Text className="absolute bottom-[7px] left-[7px] overflow-hidden rounded-full bg-inverse px-[6px] py-[3px] font-mono-semibold text-[9px] text-ink-onPrimary">
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
