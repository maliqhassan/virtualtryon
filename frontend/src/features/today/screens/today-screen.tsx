import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { IconButton } from '@/components/icon-button';
import { LIGHT_STRIPES, StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { useAccountQuery } from '@/features/auth';
import { useOnboardingPreferences } from '@/features/onboarding';
import { LAUNDRY_HREF, useGarmentsQuery, useLaundry } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';

import { OutfitHero } from '../components/outfit-hero';
import { QuickActions } from '../components/quick-actions';
import { dayNumber, pickOutfit } from '../lib/pick-outfit';
import { CALENDAR_HREF, NOTIFICATIONS_HREF } from '../routes';
import { useTodayStore } from '../store';

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' });
const SHORT_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' });

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

/** Home: today's outfit from the user's own wardrobe, quick actions, the week ahead. */
export function TodayScreen() {
  const now = new Date();
  const today = dayNumber(now);
  const garmentsQuery = useGarmentsQuery();
  const account = useAccountQuery().data;
  const name = firstName(account?.email);
  const part = partOfDay(now.getHours());
  const goals = useOnboardingPreferences((state) => state.goals);
  const { day, shuffles, wearing, shuffle, setWearing } = useTodayStore();

  // No useMemo: the React Compiler memoizes these.
  const inWash = useLaundry((state) => state.garmentIds);
  // Pieces in the wash are left out of the outfit.
  const garments = (garmentsQuery.data ?? []).filter((g) => !inWash.includes(g.id));
  const seed = today + (day === today ? shuffles : 0);
  const worn = day === today ? garments.filter((g) => wearing.includes(g.id)) : [];
  const outfit = worn.length ? worn : pickOutfit(garments, seed);
  const isWearing = worn.length > 0;

  const week = Array.from({ length: 4 }, (_, i) => new Date(now.getTime() + (i + 1) * 86_400_000));

  return (
    <AppScaffold inTabs>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-primary">
            {WEEKDAY.format(now)} · {DAY_MONTH.format(now)}
          </Text>
          <Text
            className="mt-sm font-display text-[36px] leading-[37px] text-ink-primary"
            accessibilityRole="header"
          >
            {/* "Good evening, Zara"; a guest gets "Good evening." with no name. */}
            {name ? `Good ${part},` : 'Good'}
            {'\n'}
            <Text className="font-display-italic">{name ?? `${part}.`}</Text>
          </Text>
        </View>
        <View className="flex-row gap-sm">
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
        seed={seed}
        wearing={isWearing}
        onShuffle={() => {
          selectionFeedback();
          shuffle(today);
        }}
        onWear={() => {
          selectionFeedback();
          setWearing(today, isWearing ? [] : outfit.map((g) => g.id));
        }}
      />

      <QuickActions goals={goals} />

      <View className="mt-xxl flex-row items-baseline justify-between">
        <Text className="font-sans-bold text-[17px] text-ink-primary">This week</Text>
        <Pressable
          onPress={() => router.push(CALENDAR_HREF)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text className="font-sans-bold text-[12px] text-primary">Calendar</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-xl mt-md"
        contentContainerClassName="gap-[9px] px-xl pb-xs"
      >
        {week.map((date, index) => (
          <Pressable
            key={date.toDateString()}
            onPress={() => router.push(CALENDAR_HREF)}
            accessibilityRole="button"
            accessibilityLabel={`${SHORT_DAY.format(date)}: nothing planned yet`}
            className="w-[112px] rounded-[18px] border border-border bg-surface p-sm"
          >
            <View className="h-[92px] overflow-hidden rounded-md">
              <StripeFill tone={LIGHT_STRIPES[index % 4]} />
            </View>
            <Text className="mx-xs mt-sm font-mono-semibold text-[9.5px] uppercase text-neutral-400">
              {SHORT_DAY.format(date)}
            </Text>
            <Text className="mx-xs mb-xxs mt-xxs font-sans-bold text-[12px] leading-[16px] text-ink-primary">
              Nothing planned
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => router.push(LAUNDRY_HREF)}
        accessibilityRole="button"
        className="mt-lg flex-row items-center gap-md rounded-[18px] border border-callout-border bg-callout-bg px-lg py-[14px]"
      >
        <AppIcon name="local_laundry_service" size={21} color="#9A7418" />
        <View className="flex-1">
          <Text className="font-sans-bold text-[13px] text-ink-primary">
            {inWash.length
              ? `${inWash.length} ${inWash.length === 1 ? 'piece' : 'pieces'} in the laundry`
              : 'Laundry basket'}
          </Text>
          <Text className="mt-xxs font-sans text-[11.5px] text-ink-secondary">
            Pieces in the wash are left out of suggestions
          </Text>
        </View>
        <AppIcon name="chevron_right" size="sm" color={themeColors.neutral400} />
      </Pressable>
    </AppScaffold>
  );
}
