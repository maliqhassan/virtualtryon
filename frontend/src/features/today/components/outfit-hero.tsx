import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { FadeInView } from '@/components/fade-in-view';
import { StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { ADD_GARMENT_HREF, type Garment, tryOnGarmentHref } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';

const PLACEHOLDER_CAPTIONS = ['a top you love', 'a bottom', 'shoes'];

function Tile({ garment, caption }: { garment?: Garment; caption: string }) {
  return (
    <View className="flex-1 justify-end overflow-hidden rounded-[21px] p-[11px]">
      {garment ? (
        <Image
          source={{ uri: resolveMediaUrl(garment.imageUrl) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={garment.title}
        />
      ) : (
        <StripeFill tone="dark" period={8} />
      )}
      <Text className="font-mono text-[11px] text-neutral-400" numberOfLines={1}>
        {garment ? '' : caption}
      </Text>
    </View>
  );
}

function OutlineIconButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`w-[50px] items-center justify-center rounded-[15px] border-[1.5px] border-[rgba(246,241,232,0.2)] ${disabled ? 'opacity-40' : ''}`}
    >
      <AppIcon name={icon} size={19} color={themeColors.cream} />
    </Pressable>
  );
}

/** Where today's outfit came from, most deliberate first. */
export type OutfitSource = 'wearing' | 'planned' | 'pick';

const OVERLINE: Record<OutfitSource, string> = {
  wearing: 'Wearing today',
  planned: 'Planned for today',
  pick: 'Today’s outfit',
};
const REASON: Record<OutfitSource, string> = {
  wearing: 'You’re wearing this today. It stays until tomorrow.',
  planned: 'From your calendar. Tap the calendar button to change it.',
  pick: 'Picked from your wardrobe. Shuffle for another.',
};

type OutfitHeroProps = {
  outfit: Garment[];
  source: OutfitSource;
  /** Planned pieces left out because they're in the wash. */
  washedOut: number;
  /** Changes on every shuffle; the mosaic cross-fades when it does. */
  seed: number;
  onShuffle: () => void;
  onWear: () => void;
  /** Opens today in the calendar. */
  onEditPlan: () => void;
};

/** The dark hero card: today's pieces, where they came from, and the actions. */
export function OutfitHero({
  outfit,
  source,
  washedOut,
  seed,
  onShuffle,
  onWear,
  onEditPlan,
}: OutfitHeroProps) {
  const [first, second, third] = outfit;
  const empty = outfit.length === 0;
  const wearing = source === 'wearing';
  const reason =
    washedOut > 0
      ? `From your calendar. ${washedOut === 1 ? 'One piece is' : `${washedOut} pieces are`} in the wash, so ${washedOut === 1 ? 'it’s' : 'they’re'} left out.`
      : REASON[source];
  const name = empty
    ? 'Your first outfit is waiting'
    : outfit.length === 1
      ? first.title
      : `${first.title} with ${second.title}`;

  return (
    <View
      className="mt-[20px] overflow-hidden rounded-hero bg-inverse"
      style={{ boxShadow: '0px 14px 34px rgba(22, 19, 15, 0.18)' }}
    >
      <FadeInView key={seed}>
        <View className="flex-row gap-[7px] px-sm pt-sm" style={{ aspectRatio: 1.4 }}>
          <View style={{ flex: 1.5 }} className="flex-row">
            <Tile garment={first} caption={PLACEHOLDER_CAPTIONS[0]} />
            {!empty && (
              <View className="absolute left-[11px] top-[11px] flex-row items-center gap-[5px] rounded-full bg-[rgba(18,17,15,0.55)] px-[10px] py-[6px]">
                <AppIcon name="verified" size={13} color={themeColors.goldSoft} />
                <Text className="font-mono-semibold text-[11px] text-night-text">your pieces</Text>
              </View>
            )}
          </View>
          <View className="flex-1 gap-[7px]">
            <Tile garment={second} caption={PLACEHOLDER_CAPTIONS[1]} />
            <Tile garment={third} caption={PLACEHOLDER_CAPTIONS[2]} />
          </View>
        </View>
      </FadeInView>

      <View className="px-xl pb-xl pt-lg">
        <Text className="font-mono text-[11px] uppercase tracking-[1.6px] text-gold-overline">
          {empty ? 'Today’s outfit' : OVERLINE[source]}
        </Text>
        <Text
          className="mt-[6px] font-display text-[27px] leading-[29px] text-cream"
          numberOfLines={2}
        >
          {name}
        </Text>
        <View className="mt-[9px] flex-row gap-sm">
          <AppIcon name="auto_awesome" size={15} color="#D9B26A" />
          <Text className="flex-1 font-sans text-[12.5px] leading-[19px] text-night-body">
            {empty
              ? 'Add a few pieces and an outfit from what you own is waiting here every morning.'
              : reason}
          </Text>
        </View>

        <View className="mt-lg flex-row gap-sm">
          <View className="flex-1">
            {empty ? (
              <AppButton
                label="Add your pieces"
                variant="cream"
                icon="add"
                onPress={() => router.push(ADD_GARMENT_HREF)}
              />
            ) : (
              <AppButton
                label="See it on me"
                variant="cream"
                icon="visibility"
                onPress={() => router.navigate(tryOnGarmentHref(first.id))}
              />
            )}
          </View>
          {/* Only the daily pick shuffles: a planned outfit is changed in the
              calendar, and a worn one is undone first. */}
          {source === 'planned' ? (
            <OutlineIconButton
              icon="edit_calendar"
              label="Change today’s plan"
              onPress={onEditPlan}
            />
          ) : (
            <OutlineIconButton
              icon="shuffle"
              label="Shuffle the outfit"
              onPress={onShuffle}
              disabled={source === 'wearing' || outfit.length < 2}
            />
          )}
          <OutlineIconButton
            icon={wearing ? 'check_circle' : 'bookmark_border'}
            label={wearing ? 'Wearing this today. Tap to undo' : 'Wear this today'}
            onPress={onWear}
            disabled={empty}
          />
        </View>
      </View>
    </View>
  );
}
