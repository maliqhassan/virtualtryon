import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppScaffold } from '@/components/app-scaffold';
import { IconButton } from '@/components/icon-button';
import { useAccountQuery } from '@/features/auth';
import { useOnboardingPreferences } from '@/features/onboarding';
import { CreditsPill, useUsageQuery } from '@/features/usage';
import { useGarmentsQuery, useLaundry } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';

import { useCalendar } from '../calendar-store';
import { LaundryNotice } from '../components/laundry-notice';
import { OutfitHero, type OutfitSource } from '../components/outfit-hero';
import { PortraitsRail } from '../components/portraits-rail';
import { QuickActions } from '../components/quick-actions';
import { WeekAhead } from '../components/week-ahead';
import { dayNumber, pickOutfit } from '../lib/pick-outfit';
import { planPieces } from '../lib/plans';
import { NOTIFICATIONS_HREF, calendarDayHref } from '../routes';
import { useTodayStore } from '../store';

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' });

function partOfDay(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** The first part of the email, capitalised ("zara.k@…" → "Zara"); null for a guest. */
function firstName(email: string | null | undefined): string | null {
  const local = email?.split('@')[0]?.split(/[._+-]/)[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
}

/**
 * Home: a greeting, today's outfit (what the user is wearing, else what they
 * planned, else a pick from their wardrobe), the week ahead from the
 * calendar, their portraits and shortcuts. Starting a try-on is the tab
 * bar's centre button.
 */
export function TodayScreen() {
  const now = new Date();
  const today = dayNumber(now);
  const allGarments = useGarmentsQuery().data ?? [];
  const account = useAccountQuery().data;
  const usage = useUsageQuery().data;
  const name = firstName(account?.email);
  const part = partOfDay(now.getHours());
  const goals = useOnboardingPreferences((state) => state.goals);
  const { day, shuffles, wearing, shuffle, setWearing } = useTodayStore();
  const plannedIds = useCalendar((state) => state.plans[today]);

  // No useMemo: the React Compiler memoizes these.
  const inWash = useLaundry((state) => state.garmentIds);
  // Pieces in the wash are left out of the outfit.
  const garments = allGarments.filter((g) => !inWash.includes(g.id));
  const seed = today + (day === today ? shuffles : 0);
  const worn = day === today ? garments.filter((g) => wearing.includes(g.id)) : [];
  // In the order planned; a planned piece that's gone in the wash drops out.
  const plannedAll = planPieces(plannedIds, allGarments);
  const planned = plannedAll.filter((g) => !inWash.includes(g.id));
  const [source, outfit]: [OutfitSource, typeof garments] = worn.length
    ? ['wearing', worn]
    : planned.length
      ? ['planned', planned]
      : ['pick', pickOutfit(garments, seed)];

  return (
    <AppScaffold inTabs>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-mono text-[11px] uppercase tracking-[1.6px] text-primary">
            {WEEKDAY.format(now)} · {DAY_MONTH.format(now)}
          </Text>
          <Text
            className="mt-sm font-display text-[32px] leading-[35px] text-ink-primary"
            accessibilityRole="header"
          >
            {/* "Good evening, Zara"; a guest gets "Good evening." with no name. */}
            {name ? `Good ${part},` : 'Good'}
            {'\n'}
            <Text className="font-display-italic">{name ?? `${part}.`}</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-sm">
          {usage && <CreditsPill usage={usage} />}
          <IconButton
            icon="notifications"
            size={42}
            accessibilityLabel="Notifications"
            onPress={() => router.push(NOTIFICATIONS_HREF)}
          />
        </View>
      </View>

      <OutfitHero
        outfit={outfit}
        source={source}
        washedOut={source === 'planned' ? plannedAll.length - planned.length : 0}
        seed={seed}
        onEditPlan={() => router.push(calendarDayHref(today))}
        onShuffle={() => {
          selectionFeedback();
          shuffle(today);
        }}
        onWear={() => {
          selectionFeedback();
          setWearing(today, source === 'wearing' ? [] : outfit.map((g) => g.id));
        }}
      />
      {/* Counted from the wardrobe, so a deleted piece left in the basket doesn't count. */}
      <LaundryNotice count={allGarments.length - garments.length} />

      <WeekAhead garments={allGarments} />
      <PortraitsRail />
      <QuickActions goals={goals} />
    </AppScaffold>
  );
}
