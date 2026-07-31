import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppImage } from '@/components/app-image';
import { resolveMediaUrl } from '@/lib/media-url';

import type { SavedLook } from '../types';

type SavedLookCardProps = {
  look: SavedLook;
  onToggleFavourite: (look: SavedLook) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SavedLookCard({ look, onToggleFavourite }: SavedLookCardProps) {
  const openDetails = () =>
    router.push({ pathname: '/saved-looks/detail/[lookId]', params: { lookId: look.id } });

  return (
    // A plain View, not a Pressable: react-native-web renders
    // accessibilityRole="button" as a real <button>, and nesting one
    // <button> inside another is invalid HTML — verified directly (a real
    // browser session logged a hydration warning for exactly this). The
    // favourite-toggle Pressable below is a sibling, not a descendant, of
    // the "open details" Pressables.
    <View className="mb-md overflow-hidden rounded-xl border border-border bg-surface">
      <Pressable
        onPress={openDetails}
        accessibilityRole="button"
        accessibilityLabel={`Open saved look ${look.title}`}
      >
        <AppImage
          uri={resolveMediaUrl(look.generatedImageUrl)}
          accessibilityLabel={`${look.title} generated result`}
          aspectRatio={16 / 9}
          borderRadius={0}
        />
      </Pressable>

      <View className="flex-row items-center gap-sm p-sm">
        <Pressable
          onPress={openDetails}
          accessibilityRole="button"
          accessibilityLabel={`Open saved look ${look.title}`}
          className="flex-1 flex-row items-center gap-sm"
        >
          <View className="w-14">
            <AppImage
              uri={resolveMediaUrl(look.userImageUrl)}
              accessibilityLabel={`${look.title} original photo`}
              aspectRatio={1}
              borderRadius={6}
            />
          </View>
          <View className="w-14">
            <AppImage
              uri={resolveMediaUrl(look.clothingImageUrl)}
              accessibilityLabel={`${look.title} garment photo`}
              aspectRatio={1}
              borderRadius={6}
            />
          </View>

          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink-primary" numberOfLines={1}>
              {look.title}
            </Text>
            <Text className="text-xs text-ink-secondary">{formatDate(look.createdAt)}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => onToggleFavourite(look)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={look.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          accessibilityState={{ selected: look.isFavourite }}
        >
          <Text className="text-xl">{look.isFavourite ? '★' : '☆'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
