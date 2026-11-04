import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { ScreenHeader } from '@/components/screen-header';
import { StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { TRY_ON_HOME_HREF } from '@/features/tryon';

const PARTS = [
  ['palette', 'Colour', 'How the shades work with your skin tone'],
  ['straighten', 'Fit', 'Where it sits on your frame'],
  ['watch', 'Styling', 'Shoes, layers and accessories'],
] as const;

/**
 * Rate my fit: a selfie in, a score and three tips out. Scoring needs the
 * analysis model on the server, which isn't connected yet; this shows what
 * it will do and points to try-on, which works now.
 */
export function RateScreen() {
  return (
    <AppScaffold back>
      <ScreenHeader
        variant="editorial"
        eyebrow="Coming soon"
        title="Rate my"
        italic="fit."
        italicInline
        subtitle="Take a mirror selfie and get an overall score, a breakdown and three specific tips."
      />
      <View className="aspect-[4/5] items-center justify-center overflow-hidden rounded-hero">
        <StripeFill tone="blush" period={9} />
        <AppIcon name="photo_camera" size={44} color="rgba(22, 19, 15, 0.25)" />
        <Text className="mt-sm font-mono text-[10px] text-neutral-500">[ your selfie ]</Text>
      </View>
      <View className="mt-lg gap-sm">
        {PARTS.map(([icon, title, body]) => (
          <View
            key={title}
            className="flex-row items-center gap-md rounded-[18px] border border-border bg-surface p-md"
          >
            <AppIcon name={icon} size="md" color={themeColors.primary} />
            <View className="flex-1">
              <Text className="font-sans-bold text-[13.5px] text-ink-primary">{title}</Text>
              <Text className="font-sans text-[12px] text-ink-secondary">{body}</Text>
            </View>
          </View>
        ))}
      </View>
      <View className="mt-xl">
        <AppButton
          label="See a piece on you instead"
          variant="accent"
          icon="auto_awesome"
          onPress={() => router.navigate(TRY_ON_HOME_HREF)}
        />
      </View>
    </AppScaffold>
  );
}
