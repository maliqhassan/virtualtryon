import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { themeColors } from '@/constants/theme';
import {
  MY_PHOTO_HREF,
  PHOTO_ANGLES,
  displayUrl,
  myPhotoHref,
  type MyPhoto,
} from '@/features/my-photo';
import { resolveMediaUrl } from '@/lib/media-url';

/**
 * Step 1 on the dark stage: the front photo as a thumbnail, which views are
 * added, and "Change". Side and back views live on the My photo screen.
 */
export function YouCard({ photos }: { photos: MyPhoto[] }) {
  const front = photos.find((p) => p.angle === 'front') ?? null;

  if (!front) {
    return (
      <Pressable
        onPress={() => router.push(MY_PHOTO_HREF)}
        accessibilityRole="button"
        accessibilityLabel="Add your photo"
        className="flex-row items-center gap-md rounded-xxl p-[10px]"
        style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.2)' }}
      >
        <View className="h-[68px] w-[52px] items-center justify-center rounded-md bg-night-surface">
          <AppIcon name="add_a_photo" size="md" color={themeColors.goldSoft} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-[13px] text-night-text">Add your photo</Text>
          <Text className="mt-[3px] font-sans text-[11.5px] text-neutral-500">
            One full-body photo, used for every try-on
          </Text>
        </View>
        <AppIcon name="chevron_right" size="sm" color={themeColors.inkSecondary} />
      </Pressable>
    );
  }

  const views = PHOTO_ANGLES.map(
    (view) => `${view.label}${photos.some((p) => p.angle === view.angle) ? ' ✓' : ''}`,
  ).join(' · ');

  return (
    <Pressable
      onPress={() => router.push(myPhotoHref('front'))}
      accessibilityRole="button"
      accessibilityLabel={`Your photo. ${views}. Change`}
      className="flex-row items-center gap-md rounded-xxl border border-[rgba(255,255,255,0.08)] bg-night-surface p-[10px]"
    >
      <View className="w-[52px] overflow-hidden rounded-md bg-[#3A3128]">
        <AppImage
          uri={resolveMediaUrl(displayUrl(front))}
          accessibilityLabel="Your front view"
          aspectRatio={52 / 68}
          fit="cover"
          borderRadius={0}
        />
      </View>
      <View className="flex-1">
        <Text className="font-sans-bold text-[13px] text-night-text">{views}</Text>
        <Text className="mt-[3px] font-sans text-[11.5px] text-neutral-500">
          {front.cutoutUrl ? 'Background removed' : 'Original photo'} · used for every try-on
        </Text>
      </View>
      <Text className="pr-[6px] font-sans-bold text-[12px] text-gold-soft">Change</Text>
    </Pressable>
  );
}
