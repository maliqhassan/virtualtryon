import { router } from 'expo-router';
import { Text } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { PressableScale } from '@/components/pressable-scale';
import { themeColors } from '@/constants/theme';

import { UPGRADE_HREF } from '../routes';
import type { Usage } from '../types';

import { describeUsage } from './usage-pill';

/**
 * "✦ 3" in Today's header (handoff v2.1 change 3): credits left (one per try-on), opening
 * Plans. "∞" while limits are off for testing.
 */
export function CreditsPill({ usage }: { usage: Usage }) {
  const count = usage.unlimited ? '∞' : String(usage.remaining);
  // None left: greyed, as the usage pill does, so 0 doesn't look available.
  const empty = !usage.unlimited && usage.remaining <= 0;
  return (
    <PressableScale
      onPress={() => router.push(UPGRADE_HREF)}
      accessibilityRole="button"
      accessibilityLabel={`${describeUsage(usage)}. See plans`}
      accessibilityLiveRegion="polite"
      pressedScale={0.94}
      className={`h-[42px] flex-row items-center gap-[6px] rounded-full px-[13px] ${
        empty ? 'bg-neutral-200' : 'border border-border bg-surface'
      }`}
    >
      <AppIcon
        name="auto_awesome"
        size={17}
        color={empty ? themeColors.neutral500 : themeColors.primary}
      />
      <Text
        className={`font-sans-bold text-[13px] ${empty ? 'text-ink-secondary' : 'text-ink-primary'}`}
      >
        {count}
      </Text>
    </PressableScale>
  );
}
