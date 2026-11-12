import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { Skeleton } from '@/components/skeleton';
import { themeColors } from '@/constants/theme';
import { resolveMediaUrl } from '@/lib/media-url';

import { usePortraits } from '../hooks/use-portraits';
import { myPhotoHref } from '../routes';
import { displayUrl } from '../types';

/**
 * Wardrobe's Portraits tab (handoff v2.1 change 7): an "Add portrait" tile,
 * then the user's photos, two to a row. The front one is what every try-on
 * uses ("in use"). Add fills the first missing view; tapping a photo opens
 * My photo on that view. Fills its parent.
 */
export function PortraitsGrid() {
  const { ordered, addHref, isLoading, isError, refetch } = usePortraits();

  if (isLoading) {
    return (
      <View className="flex-row justify-between">
        {[0, 1].map((n) => (
          <View key={n} className="w-[48.5%]">
            <Skeleton aspectRatio={3 / 4} radius={20} />
          </View>
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-md">
        <Text className="font-sans-semibold text-lg text-ink-primary">
          Couldn&rsquo;t load your portraits
        </Text>
        <Text className="text-center font-sans text-sm text-ink-secondary">
          Check your connection and try again.
        </Text>
        <AppButton label="Retry" variant="secondary" onPress={refetch} />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-xl">
      <View className="flex-row flex-wrap justify-between gap-y-[11px]">
        <Pressable
          onPress={() => addHref && router.push(addHref)}
          accessibilityRole="button"
          accessibilityLabel="Add a portrait"
          className="aspect-[3/4] w-[48.5%] items-center justify-center gap-[5px] rounded-[20px] border-[1.5px] border-dashed border-neutral-300 bg-surface"
        >
          <AppIcon name="add" size={30} color={themeColors.inkPrimary} />
          <Text className="font-sans-semibold text-[12px] text-ink-secondary">Add portrait</Text>
        </Pressable>

        {ordered.map((photo) => {
          const inUse = photo.angle === 'front';
          return (
            <Pressable
              key={photo.id}
              onPress={() => router.push(myPhotoHref(photo.angle))}
              accessibilityRole="button"
              accessibilityLabel={`${photo.angle} portrait${inUse ? ', in use for try-ons' : ''}`}
              className="w-[48.5%]"
            >
              <AppImage
                uri={resolveMediaUrl(displayUrl(photo))}
                accessibilityLabel=""
                aspectRatio={3 / 4}
                borderRadius={20}
              />
              {inUse && (
                <View
                  pointerEvents="none"
                  className="absolute inset-0 rounded-[20px] border-[2.5px] border-inverse"
                />
              )}
              <Text
                className={`absolute bottom-[9px] left-[9px] overflow-hidden rounded-full px-[7px] py-xs font-mono-semibold text-[9.5px] ${
                  inUse ? 'bg-inverse text-ink-onPrimary' : 'bg-surface text-ink-secondary'
                }`}
              >
                {inUse ? 'in use · full body' : photo.angle}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-md font-sans text-[11.5px] leading-[17px] text-ink-secondary">
        Best results: one person, standing straight, full body in frame, good light.
      </Text>
    </ScrollView>
  );
}
