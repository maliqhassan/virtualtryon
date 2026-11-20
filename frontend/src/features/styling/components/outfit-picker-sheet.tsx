import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useEffect, useRef } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';
import { GarmentThumb, type Garment } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';

/** Enough for an outfit with layers and accessories; more is a packing list. */
export const MAX_OUTFIT_PIECES = 6;
const SNAP_POINTS = ['88%'];
const COLUMNS = 4;
const GAP = 8;
const SIDE = 18;

/** Pieces grouped by category, in the order categories first appear. */
function byCategory(garments: Garment[]): [string, Garment[]][] {
  const groups = new Map<string, Garment[]>();
  for (const g of garments) {
    const group = groups.get(g.category);
    if (group) group.push(g);
    else groups.set(g.category, [g]);
  }
  return [...groups];
}

function PieceTile({
  garment,
  size,
  picked,
  inWash,
  full,
  onToggle,
}: {
  garment: Garment;
  size: number;
  picked: boolean;
  inWash: boolean;
  full: boolean;
  onToggle: () => void;
}) {
  // A ticked piece can always be unticked, even if it's gone in the wash since.
  const disabled = !picked && (inWash || full);
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled }}
      accessibilityLabel={`${garment.title}${inWash ? ', in the wash' : ''}`}
      style={{ width: size, opacity: disabled ? 0.4 : 1 }}
    >
      <View
        className="overflow-hidden rounded-[14px]"
        style={{
          borderWidth: 2,
          borderColor: picked ? themeColors.primary : 'transparent',
        }}
      >
        <GarmentThumb garment={garment} size={size - 4} />
        {picked && (
          <View className="absolute right-[5px] top-[5px] h-[22px] w-[22px] items-center justify-center rounded-full bg-primary">
            <AppIcon name="check" size={14} color={themeColors.cream} />
          </View>
        )}
        {inWash && (
          <Text className="absolute bottom-[5px] left-[5px] overflow-hidden rounded-full bg-inverse px-[6px] py-[2px] font-mono-semibold text-[11px] text-cream">
            in wash
          </Text>
        )}
      </View>
      <Text numberOfLines={1} className="mt-xs font-sans text-[11px] text-ink-secondary">
        {garment.title}
      </Text>
    </Pressable>
  );
}

/**
 * Choose the pieces for a day: the wardrobe by category, tap to tick (up to
 * MAX_OUTFIT_PIECES), pieces in the wash can't be picked. The parent owns
 * the ticked pieces (`picked`, reset when it opens the sheet). `open` drives
 * it; `onClose` runs when it's dismissed (Save, swipe down or tapping
 * outside).
 */
export function OutfitPickerSheet({
  open,
  title,
  garments,
  inWash,
  picked,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  garments: Garment[];
  inWash: string[];
  picked: string[];
  onChange: (garmentIds: string[]) => void;
  onSave: (garmentIds: string[]) => void;
  onClose: () => void;
}) {
  const sheet = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.floor((width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const full = picked.length >= MAX_OUTFIT_PIECES;
  const pickedIds = new Set(picked);
  const washIds = new Set(inWash);

  useEffect(() => {
    if (open) sheet.current?.snapToIndex(0);
    else sheet.current?.close();
  }, [open]);

  const toggle = (id: string) => {
    selectionFeedback();
    onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />
  );

  const renderFooter = (props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props}>
      <View
        className="border-t border-border bg-surface px-[18px] pt-md"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <AppButton
          label={picked.length ? `Save outfit · ${picked.length}` : 'Pick at least one piece'}
          disabled={picked.length === 0}
          onPress={() => {
            onSave(picked);
            // The sheet's own onClose then tells the parent, once.
            sheet.current?.close();
          }}
        />
      </View>
    </BottomSheetFooter>
  );

  return (
    <BottomSheet
      ref={sheet}
      index={-1}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={{
        backgroundColor: themeColors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
      handleIndicatorStyle={{ backgroundColor: themeColors.neutral300, width: 40 }}
    >
      <View className="px-[18px] pb-md">
        <Text className="font-display text-[24px] text-ink-primary" accessibilityRole="header">
          {title}
        </Text>
        <Text className="mt-xxs font-sans text-[12.5px] text-ink-secondary">
          {full
            ? `That’s ${MAX_OUTFIT_PIECES}, the most for one outfit. Untick one to swap.`
            : 'Tap pieces to add them to the outfit.'}
        </Text>
      </View>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingBottom: insets.bottom + 110 }}
      >
        {byCategory(garments).map(([category, pieces]) => (
          <View key={category} className="mb-lg">
            <Text className="mb-sm font-mono-semibold text-[11px] uppercase tracking-[1.2px] text-neutral-500">
              {category}
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: GAP }}>
              {pieces.map((g) => (
                <PieceTile
                  key={g.id}
                  garment={g}
                  size={size}
                  picked={pickedIds.has(g.id)}
                  inWash={washIds.has(g.id)}
                  full={full}
                  onToggle={() => toggle(g.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
