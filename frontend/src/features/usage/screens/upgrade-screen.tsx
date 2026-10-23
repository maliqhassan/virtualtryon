import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';

import { describeUsage } from '../components/usage-pill';
import { useUsageQuery } from '../hooks/use-usage-query';
import { PLAN_OFFERS, type PlanOffer } from '../types';

function PlanCard({ offer, isCurrent }: { offer: PlanOffer; isCurrent: boolean }) {
  return (
    <View
      className={[
        'rounded-xl bg-surface p-lg',
        offer.highlight ? 'border-2 border-primary' : 'border border-border',
      ].join(' ')}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-ink-primary">{offer.name}</Text>
        {isCurrent && <Text className="text-xs font-semibold text-success">Current plan</Text>}
      </View>
      <Text className="mt-xs text-base font-semibold text-ink-primary">{offer.price}</Text>
      <Text className="mt-xxs text-sm text-ink-secondary">{offer.allowance}</Text>
    </View>
  );
}

/**
 * Plans are shown, but buying isn't possible yet: payments (Apple In-App
 * Purchase) are a separate, later feature. The buttons say so plainly
 * rather than pretending to work.
 */
export function UpgradeScreen() {
  const usageQuery = useUsageQuery();
  const usage = usageQuery.data;

  return (
    <AppScaffold back>
      <Text className="font-display text-[34px] leading-[38px] text-ink-primary">
        Get more try-ons
      </Text>
      <Text className="mt-xs text-ink-secondary">
        {usage && usage.remaining <= 0
          ? usage.period === 'lifetime'
            ? 'You’ve used your free try-on. Pick a plan to keep trying clothes on.'
            : 'You’ve used today’s try-ons. They reset tomorrow, or you can upgrade.'
          : 'Pick the plan that fits how often you try clothes on.'}
      </Text>
      {usage && (
        <Text className="mt-sm text-sm text-ink-secondary">Now: {describeUsage(usage)}</Text>
      )}

      <View className="mt-xl gap-md">
        {PLAN_OFFERS.map((offer) => (
          <PlanCard key={offer.id} offer={offer} isCurrent={usage?.plan === offer.id} />
        ))}
      </View>

      <View className="mt-xl gap-sm">
        <AppButton label="Payments coming soon" onPress={() => {}} disabled />
        <Text className="text-center text-xs text-ink-secondary">
          Subscriptions aren’t available yet. Failed try-ons never count against your allowance.
        </Text>
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </AppScaffold>
  );
}
