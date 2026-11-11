import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';
import { resolveMediaUrl } from '@/lib/media-url';

/** Something to try on: one of the user's pieces, or a store's. */
export type Piece = {
  kind: 'garment' | 'product';
  id: string;
  title: string;
  imageUrl: string;
};

/**
 * One cell of the studio's 3-column grid: a 3:4 photo at radius 16, an ink
 * outline and check when picked, the name below. Tapping a picked piece
 * unpicks it.
 */
export function PieceTile({
  piece,
  selected,
  onToggle,
}: {
  piece: Piece;
  selected: boolean;
  onToggle: (piece: Piece) => void;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionFeedback();
        onToggle(piece);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${piece.title}${selected ? ', picked' : ''}`}
      className="w-[31.5%]"
    >
      <View>
        <AppImage
          uri={resolveMediaUrl(piece.imageUrl)}
          accessibilityLabel=""
          aspectRatio={3 / 4}
          borderRadius={16}
        />
        {selected && (
          <>
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-[16px] border-[2.5px] border-inverse"
            />
            <View className="absolute right-[6px] top-[6px] h-[22px] w-[22px] items-center justify-center rounded-full bg-inverse">
              <AppIcon name="check" size={14} color={themeColors.surface} />
            </View>
          </>
        )}
      </View>
      <Text
        numberOfLines={2}
        className="mt-[6px] font-sans-semibold text-[11px] leading-[14px] text-ink-primary"
      >
        {piece.title}
      </Text>
    </Pressable>
  );
}

/** The dashed first cell of My clothes. */
export function AddPieceTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add clothes"
      className="w-[31.5%]"
    >
      <View className="aspect-[3/4] items-center justify-center gap-xs rounded-[16px] border-[1.5px] border-dashed border-neutral-300 bg-surface">
        <AppIcon name="add" size={26} color={themeColors.inkPrimary} />
        <Text className="font-sans-semibold text-[10.5px] text-ink-secondary">Add clothes</Text>
      </View>
    </Pressable>
  );
}
