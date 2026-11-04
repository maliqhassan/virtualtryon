import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';
import { type Garment, GarmentThumb, tryOnGarmentHref } from '@/features/wardrobe';

/** An outfit as a row of thumbnails with a name and "Try on" for its first piece. */
export function OutfitRow({ title, outfit }: { title: string; outfit: Garment[] }) {
  return (
    <View className="rounded-[20px] border border-[rgba(22,19,15,0.07)] bg-surface p-md">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-sans-bold text-[13.5px] text-ink-primary" numberOfLines={1}>
          {title}
        </Text>
        {outfit[0] && (
          <Pressable
            onPress={() => router.navigate(tryOnGarmentHref(outfit[0].id))}
            accessibilityRole="button"
            accessibilityLabel={`Try ${outfit[0].title} on`}
            hitSlop={8}
            className="flex-row items-center gap-xs"
          >
            <AppIcon name="auto_awesome" size={15} color={themeColors.primary} />
            <Text className="font-sans-bold text-[12px] text-primary">Try on</Text>
          </Pressable>
        )}
      </View>
      <View className="mt-sm flex-row gap-xs">
        {outfit.map((g) => (
          <GarmentThumb key={g.id} garment={g} size={64} />
        ))}
      </View>
      <Text className="mt-sm font-mono text-[10px] text-neutral-500" numberOfLines={1}>
        {outfit.map((g) => g.title).join(' · ')}
      </Text>
    </View>
  );
}
