import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { ListSectionLabel } from '@/components/list-card';
import { ScreenHeader } from '@/components/screen-header';
import { themeColors } from '@/constants/theme';
import { selectionFeedback } from '@/lib/haptics';

import { GarmentThumb } from '../components/garment-thumb';
import { useGarmentsQuery } from '../hooks/use-garments-query';
import { useLaundry } from '../laundry-store';
import type { Garment } from '../types';

function Row({ garment, inWash }: { garment: Garment; inWash: boolean }) {
  const toggle = useLaundry((state) => state.toggle);
  return (
    <Pressable
      onPress={() => {
        selectionFeedback();
        toggle(garment.id);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: inWash }}
      accessibilityLabel={`${garment.title}, ${inWash ? 'in the wash' : 'clean'}`}
      className="flex-row items-center gap-md rounded-[18px] border border-border bg-surface p-sm"
    >
      <GarmentThumb garment={garment} />
      <View className="flex-1">
        <Text className="font-sans-bold text-[13.5px] text-ink-primary" numberOfLines={1}>
          {garment.title}
        </Text>
        <Text className="mt-xxs font-mono text-[10.5px] text-neutral-500">{garment.category}</Text>
      </View>
      <AppIcon
        name={inWash ? 'local_laundry_service' : 'add_circle'}
        size="md"
        color={inWash ? '#9A7418' : themeColors.neutral300}
      />
    </Pressable>
  );
}

/** The laundry basket: pieces in the wash are left out of Today's outfit. */
export function LaundryScreen() {
  const garments = useGarmentsQuery().data ?? [];
  const inWash = useLaundry((state) => state.garmentIds);
  const clear = useLaundry((state) => state.clear);
  const washing = garments.filter((g) => inWash.includes(g.id));
  const clean = garments.filter((g) => !inWash.includes(g.id));

  return (
    <AppScaffold back>
      <ScreenHeader
        eyebrow={`${washing.length} in the basket`}
        title="Laundry"
        subtitle="Pieces in the wash are left out of Today’s outfit. Tap a piece to move it."
      />
      {washing.length > 0 && (
        <>
          <View className="gap-sm">
            {washing.map((g) => (
              <Row key={g.id} garment={g} inWash />
            ))}
          </View>
          <View className="mt-md">
            <AppButton label="All washed" variant="secondary" icon="check" onPress={clear} />
          </View>
        </>
      )}
      <ListSectionLabel>In your wardrobe</ListSectionLabel>
      {clean.length === 0 ? (
        <Text className="font-sans text-[13px] text-ink-secondary">
          {garments.length === 0
            ? 'Add pieces to your wardrobe first.'
            : 'Everything is in the wash.'}
        </Text>
      ) : (
        <View className="gap-sm">
          {clean.map((g) => (
            <Row key={g.id} garment={g} inWash={false} />
          ))}
        </View>
      )}
    </AppScaffold>
  );
}
