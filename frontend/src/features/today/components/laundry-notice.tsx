import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';
import { LAUNDRY_HREF } from '@/features/wardrobe';

import { piecesLabel } from '../lib/plans';

/**
 * A slim note that pieces are in the wash, so the user knows why they're
 * missing from the outfit. Nothing at all when the basket is empty; the
 * laundry screen (where pieces go in the wash) is also on You.
 */
export function LaundryNotice({ count }: { count: number }) {
  if (count === 0) return null;
  const pieces = piecesLabel(count);
  return (
    <Pressable
      onPress={() => router.push(LAUNDRY_HREF)}
      accessibilityRole="button"
      accessibilityLabel={`${pieces} in the laundry, left out of suggestions. Open the laundry`}
      className="mt-md flex-row items-center gap-sm rounded-full border border-callout-border bg-callout-bg py-[9px] pl-md pr-sm"
    >
      <AppIcon name="local_laundry_service" size={17} color="#9A7418" />
      <Text className="flex-1 font-sans text-[12px] text-ink-secondary">
        <Text className="font-sans-bold text-ink-primary">{pieces} in the wash</Text>
        {' · left out of today’s pick'}
      </Text>
      <AppIcon name="chevron_right" size="sm" color={themeColors.neutral400} />
    </Pressable>
  );
}
