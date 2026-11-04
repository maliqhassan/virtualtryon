import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { GradientFill } from '@/components/gradient-fill';
import { IconButton } from '@/components/icon-button';
import { ListCard, ListRow } from '@/components/list-card';
import { PressableScale } from '@/components/pressable-scale';
import { StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { useAccountQuery, useSignOut } from '@/features/auth';
import { MY_PHOTO_HREF, displayUrl, useMyPhotoQuery } from '@/features/my-photo';
import { SIGN_IN_HREF } from '@/features/onboarding';
import { LOOKS_HREF, useSavedLooksQuery } from '@/features/saved-looks';
import { CALENDAR_HREF, NOTIFICATIONS_HREF } from '@/features/today';
import { UPGRADE_HREF, describeUsage, useUsageQuery } from '@/features/usage';
import { LAUNDRY_HREF, PACKING_HREF, STATS_HREF, useGarmentsQuery } from '@/features/wardrobe';
import { confirmDestructiveAction } from '@/lib/confirm';
import { resolveMediaUrl } from '@/lib/media-url';

import { HELP_HREF, SETTINGS_HREF } from '../routes';

const PLAN_NAMES = { free: 'Free', pro: 'Pro', pro_plus: 'Pro Plus' } as const;
const PALETTE = ['#F2E8D8', '#C9A06A', '#4E5B44', '#A8452F', '#3A362F'];

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-[18px] border border-[rgba(22,19,15,0.07)] bg-surface p-[13px]">
      <Text
        className={`font-display text-[26px] leading-[27px] ${accent ? 'text-primary' : 'text-ink-primary'}`}
      >
        {value}
      </Text>
      <Text className="mt-[5px] font-mono text-[9.5px] text-neutral-500">{label}</Text>
    </View>
  );
}

/** The profile hub: who you are, your numbers, your plan, and everything else. */
export function YouScreen() {
  const account = useAccountQuery().data;
  const photo = useMyPhotoQuery().data ?? null;
  const usage = useUsageQuery().data;
  const garments = useGarmentsQuery().data ?? [];
  const looks = useSavedLooksQuery().data ?? [];
  const signOut = useSignOut();
  const signedIn = !!account?.email;

  const name = signedIn ? account.email!.split('@')[0] : 'Guest';
  const handleSignOut = async () => {
    const confirmed = await confirmDestructiveAction(
      'Sign out?',
      'Your wardrobe and looks stay in your account. This phone continues as a new guest.',
      'Sign out',
    );
    if (confirmed) signOut.mutate();
  };

  return (
    <AppScaffold inTabs>
      <View className="flex-row items-center gap-[14px]">
        <View
          className="h-16 w-16 overflow-hidden rounded-full border-[3px] border-surface"
          style={{ boxShadow: '0px 4px 14px rgba(22, 19, 15, 0.1)' }}
        >
          {photo ? (
            <AppImage
              uri={resolveMediaUrl(displayUrl(photo))}
              accessibilityLabel="Your photo"
              aspectRatio={1}
              borderRadius={0}
            />
          ) : (
            <StripeFill tone="warm" period={6} />
          )}
        </View>
        <View className="flex-1">
          <Text
            className="font-display text-[28px] leading-[29px] text-ink-primary"
            accessibilityRole="header"
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text className="mt-[5px] font-mono text-[10.5px] text-neutral-500" numberOfLines={1}>
            {signedIn ? account.email : 'guest · not signed in'}
          </Text>
        </View>
        <IconButton
          icon="settings"
          accessibilityLabel="Settings"
          onPress={() => router.push(SETTINGS_HREF)}
        />
      </View>

      <PressableScale
        onPress={() => router.push(MY_PHOTO_HREF)}
        pressedScale={0.98}
        accessibilityRole="button"
        accessibilityLabel="Style profile, sample. Update your photo"
        containerClassName="mt-[18px]"
        className="rounded-[24px] bg-inverse px-xl py-[18px]"
      >
        <View className="flex-row justify-between">
          <Text className="font-mono text-[10px] tracking-[1.6px] text-gold-overline">
            STYLE PROFILE · SAMPLE
          </Text>
          <Text className="font-mono-semibold text-[10.5px] text-neutral-500">
            {photo ? 'rescan' : 'add photo'}
          </Text>
        </View>
        <Text className="mt-[10px] font-display text-[25px] leading-[27px] text-cream">
          Warm neutral, <Text className="font-display-italic text-gold-soft">rectangle</Text>
        </Text>
        <View className="mt-[14px] flex-row gap-[5px]">
          {PALETTE.map((color) => (
            <View
              key={color}
              className="h-[22px] flex-1 rounded-[7px]"
              style={{ backgroundColor: color }}
            />
          ))}
        </View>
      </PressableScale>

      <View className="mt-[10px] flex-row gap-[9px]">
        <Stat value={String(garments.length)} label="PIECES" />
        <Stat value={String(looks.length)} label="SAVED LOOKS" />
        <Stat
          value={usage ? (usage.unlimited ? '∞' : String(usage.remaining)) : '–'}
          label="TRY-ONS LEFT"
          accent
        />
      </View>

      <PressableScale
        onPress={() => router.push(UPGRADE_HREF)}
        pressedScale={0.98}
        accessibilityRole="button"
        accessibilityLabel="See plans"
        containerClassName="mt-[10px]"
        className="flex-row items-center gap-[14px] overflow-hidden rounded-[22px] px-[18px] py-lg"
      >
        <GradientFill
          kind="linear"
          horizontal
          stops={[
            { offset: 0, color: '#D9B26A' },
            { offset: 1, color: '#B4713F' },
          ]}
        />
        <View className="flex-1">
          <Text className="font-mono text-[9.5px] uppercase tracking-[1.3px] text-[rgba(26,21,9,0.65)]">
            {usage ? `${PLAN_NAMES[usage.plan]} plan · ${describeUsage(usage)}` : 'Your plan'}
          </Text>
          <Text className="mt-[6px] font-display text-[23px] leading-[25px] text-[#1A1509]">
            {usage?.plan === 'pro_plus' ? 'You’re on our top plan' : 'Go Pro for more try-ons'}
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-inverse">
          <AppIcon name="arrow_forward" size={19} color={themeColors.goldSoft} />
        </View>
      </PressableScale>

      <View className="mt-md">
        <ListCard>
          <ListRow
            icon="favorite"
            iconColor={themeColors.primary}
            label="Saved looks"
            meta={String(looks.length)}
            onPress={() => router.push(LOOKS_HREF)}
          />
          <ListRow
            icon="local_laundry_service"
            label="Laundry"
            onPress={() => router.push(LAUNDRY_HREF)}
          />
          <ListRow icon="insights" label="Wardrobe stats" onPress={() => router.push(STATS_HREF)} />
          <ListRow
            icon="luggage"
            label="Packing planner"
            onPress={() => router.push(PACKING_HREF)}
          />
          <ListRow
            icon="calendar_month"
            label="Calendar"
            onPress={() => router.push(CALENDAR_HREF)}
          />
          <ListRow
            icon="notifications"
            label="Notifications"
            onPress={() => router.push(NOTIFICATIONS_HREF)}
          />
          <ListRow icon="help" label="Help centre" onPress={() => router.push(HELP_HREF)} />
        </ListCard>
      </View>

      <View className="mt-md">
        <ListCard>
          {signedIn ? (
            <ListRow
              icon="logout"
              label={signOut.isPending ? 'Signing out…' : 'Sign out'}
              onPress={handleSignOut}
            />
          ) : (
            <ListRow
              icon="login"
              iconColor={themeColors.primary}
              label="Sign in to keep your wardrobe"
              onPress={() => router.push(SIGN_IN_HREF)}
            />
          )}
        </ListCard>
      </View>

      <Text className="mt-xl text-center font-mono text-[10.5px] text-neutral-400">
        AI Stylist · v1.0.0
      </Text>
    </AppScaffold>
  );
}
