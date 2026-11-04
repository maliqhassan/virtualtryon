import { FlatList, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { PressableScale } from '@/components/pressable-scale';
import { themeColors } from '@/constants/theme';
import type { Garment } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';

const TILE_WIDTH = 84;
const TILE_HEIGHT = 108;

type GarmentPickerProps = {
  garments: Garment[];
  selectedId: string | null;
  onSelect: (garment: Garment) => void;
  onAdd: () => void;
};

/** Horizontal rail of wardrobe pieces on the dark stage, with "Add new" first. */
export function GarmentPicker({ garments, selectedId, onSelect, onAdd }: GarmentPickerProps) {
  return (
    <FlatList
      horizontal
      data={garments}
      keyExtractor={(garment) => garment.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 9, paddingVertical: 4, paddingHorizontal: 2 }}
      ListHeaderComponent={
        <View style={{ width: TILE_WIDTH, marginRight: 9 }}>
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Add a new piece"
            className="items-center justify-center rounded-lg"
            style={{
              height: TILE_HEIGHT,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <AppIcon name="add" size="lg" color={themeColors.neutral500} />
          </Pressable>
          <Text className="mt-[6px] text-center font-sans-semibold text-[10.5px] text-neutral-500">
            Add new
          </Text>
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
              className="overflow-hidden rounded-lg bg-night-surface"
              style={{
                height: TILE_HEIGHT,
                borderWidth: 2,
                borderColor: selected ? themeColors.goldSoft : 'transparent',
              }}
            >
              <AppImage
                uri={resolveMediaUrl(item.imageUrl)}
                accessibilityLabel={item.title}
                aspectRatio={TILE_WIDTH / TILE_HEIGHT}
                borderRadius={0}
              />
              {selected && (
                <View className="absolute right-[5px] top-[5px] h-5 w-5 items-center justify-center rounded-full bg-gold-soft">
                  <AppIcon name="check" size={13} color={themeColors.night} />
                </View>
              )}
            </View>
            <Text
              className={`mt-[6px] text-center font-sans-semibold text-[10.5px] leading-[14px] ${
                selected ? 'text-night-text' : 'text-neutral-500'
              }`}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </PressableScale>
        );
      }}
    />
  );
}
