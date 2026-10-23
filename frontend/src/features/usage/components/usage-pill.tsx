import { Text, View } from 'react-native';

import type { Usage } from '../types';

export function describeUsage(usage: Usage): string {
  if (usage.period === 'lifetime') {
    return usage.remaining > 0 ? `${usage.remaining} free try-on left` : 'Free try-on used';
  }
  return `${usage.remaining} of ${usage.limit} try-ons left today`;
}

/** Shows the allowance before it runs out, never as a surprise. */
export function UsagePill({ usage }: { usage: Usage }) {
  const empty = usage.remaining <= 0;
  return (
    <View
      className={[
        'self-start rounded-full px-md py-xs',
        empty ? 'bg-neutral-200' : 'border border-border bg-surface',
      ].join(' ')}
      accessibilityLiveRegion="polite"
    >
      <Text
        className={
          empty ? 'text-xs font-semibold text-ink-secondary' : 'text-xs font-semibold text-primary'
        }
      >
        {describeUsage(usage)}
      </Text>
    </View>
  );
}
