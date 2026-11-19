import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { Skeleton } from '@/components/skeleton';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/media-url';

import { usePortraits } from '../hooks/use-portraits';
import { MY_PHOTO_HREF } from '../routes';
import { displayUrl } from '../types';

/**
 * Wardrobe's Portraits tab (handoff v2.1 change 7): an "Add portrait" tile,
 * then the user's model photos, two to a row. Tapping a photo makes it the
 * one try-ons use ("in use"); "Manage" opens My photos to add or delete.
 * Fills its parent.
 */
export function PortraitsGrid() {
  const { ordered, inUseId, select, addHref, isFull, isLoading, isError, refetch } = usePortraits();

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
          accessibilityLabel={isFull ? 'Manage your portraits' : 'Add a portrait'}
          className="aspect-[3/4] w-[48.5%] items-center justify-center gap-[5px] rounded-[20px] border-[1.5px] border-dashed border-neutral-300 bg-surface"
        >
          <AppIcon name="add" size={30} color={themeColors.inkPrimary} />
          <Text className="font-sans-semibold text-[12px] text-ink-secondary">
            {isFull ? 'Manage portraits' : 'Add portrait'}
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
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: inUse }}
              accessibilityLabel={`Portrait ${index + 1}${inUse ? ', in use for try-ons' : '. Tap to use it for try-ons'}`}
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
                className={`absolute bottom-[9px] left-[9px] overflow-hidden rounded-full px-[7px] py-xs font-mono-semibold text-[11px] ${
                  inUse ? 'bg-inverse text-ink-onPrimary' : 'bg-surface text-ink-secondary'
                }`}
              >
                {inUse ? 'in use' : 'tap to use'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-md font-sans text-[11.5px] leading-[17px] text-ink-secondary">
        Tap a portrait to try clothes on it. Best results: one person, standing straight, full body
        in frame, good light.
      </Text>
      {ordered.length > 0 && (
        <View className="mt-md">
          <AppButton
            label="Manage portraits"
            variant="secondary"
            icon="photo_library"
            onPress={() => router.push(MY_PHOTO_HREF)}
          />
        </View>
      )}
    </ScrollView>
  );
}
