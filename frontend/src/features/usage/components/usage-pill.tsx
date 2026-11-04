import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { UPGRADE_HREF } from '../routes';
import type { Usage } from '../types';

export function describeUsage(usage: Usage): string {
  if (usage.unlimited) return 'Unlimited try-ons (testing)';
  if (usage.period === 'lifetime') {
    return usage.remaining > 0 ? `${usage.remaining} free try-on left` : 'Free try-on used';
  }
  return `${usage.remaining} of ${usage.limit} try-ons left today`;
}

/** Short form for the pill ("2 of 3 today"). */
function pillText(usage: Usage): string {
  if (usage.unlimited) return 'unlimited · testing';
  if (usage.period === 'lifetime') {
    return usage.remaining > 0 ? `${usage.remaining} free left` : 'free try-on used';
  }
  return `${usage.remaining} of ${usage.limit} today`;
}

/**
 * Shows the allowance before it runs out, never as a surprise. Mono text;
 * on dark screens a gold outline. Tapping opens the plans.
 */
export function UsagePill({ usage, dark = false }: { usage: Usage; dark?: boolean }) {
  const empty = usage.remaining <= 0;
  const tone = dark
    ? 'border border-[rgba(231,199,122,0.35)]'
    : empty
      ? 'bg-neutral-200'
      : 'border border-border bg-surface';
  const textColor = dark ? 'text-gold-soft' : empty ? 'text-ink-secondary' : 'text-primary';
  return (
    <Pressable
      onPress={() => router.push(UPGRADE_HREF)}
      accessibilityRole="button"
      accessibilityLabel={`${describeUsage(usage)}. See plans`}
      accessibilityLiveRegion="polite"
      hitSlop={6}
      className={`self-start rounded-full px-[11px] py-[7px] ${tone}`}
    >
      <Text className={`font-mono-semibold text-[10.5px] ${textColor}`}>{pillText(usage)}</Text>
    </Pressable>
  );
}
