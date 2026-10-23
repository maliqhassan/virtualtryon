import { FlatList, Pressable, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';

import { AppImage } from '@/components/app-image';
import type { Garment } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';

const TILE_WIDTH = 104;

type GarmentPickerProps = {
  garments: Garment[];
  selectedId: string | null;
  onSelect: (garment: Garment) => void;
  onAdd: () => void;
};

/** Horizontal rail of wardrobe items, with an "Add" tile first. */
export function GarmentPicker({ garments, selectedId, onSelect, onAdd }: GarmentPickerProps) {
  return (
    <FlatList
      horizontal
      data={garments}
      keyExtractor={(garment) => garment.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
      ListHeaderComponent={
        // Same height as an item tile (image + label line), so the row never
        // clips the item labels.
        <View style={{ width: TILE_WIDTH, marginRight: 12 }}>
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Add clothing"
            className="items-center justify-center rounded-xxl border border-dashed border-neutral-300 bg-surface"
            style={{ aspectRatio: 3 / 4 }}
          >
            <Text className="text-2xl text-primary">+</Text>
            <Text className="mt-xxs text-xs font-semibold text-ink-primary">Add clothing</Text>
          </Pressable>
          <Text className="mt-xs text-xs text-ink-secondary"> </Text>
        </View>
      }
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <PressableScale
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${item.title}`}
            accessibilityState={{ selected }}
            containerStyle={{ width: TILE_WIDTH }}
          >
            <View
              className={[
                'overflow-hidden rounded-xxl bg-surface',
                selected ? 'border-2 border-primary' : 'border border-border',
              ].join(' ')}
            >
              <AppImage
                uri={resolveMediaUrl(item.imageUrl)}
                accessibilityLabel={item.title}
                aspectRatio={3 / 4}
                borderRadius={0}
              />
            </View>
            <Text
              className={
                selected
                  ? 'mt-xs text-xs font-semibold text-primary'
                  : 'mt-xs text-xs text-ink-secondary'
              }
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {selected && (
              <View className="absolute right-xs top-xs h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Text className="text-xs font-bold text-white">✓</Text>
              </View>
            )}
          </PressableScale>
        );
      }}
    />
  );
}
