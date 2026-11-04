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
      <Text className="font-mono text-[9px] text-neutral-500" numberOfLines={1}>
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

type OutfitHeroProps = {
  outfit: Garment[];
  /** Changes on every shuffle; the mosaic cross-fades when it does. */
  seed: number;
  wearing: boolean;
  onShuffle: () => void;
  onWear: () => void;
};

/** The dark hero card: today's three pieces, why, and the actions. */
export function OutfitHero({ outfit, seed, wearing, onShuffle, onWear }: OutfitHeroProps) {
  const [first, second, third] = outfit;
  const empty = outfit.length === 0;
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
                <Text className="font-mono-semibold text-[10.5px] text-night-text">
                  your pieces
                </Text>
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
        <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-gold-overline">
          Today’s outfit
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
              ? 'Add a few pieces and Noor puts together an outfit from what you own, every morning.'
              : 'Picked from your wardrobe for today. Noor’s weather- and calendar-aware picks arrive in an update.'}
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
          <OutlineIconButton
            icon="shuffle"
            label="Shuffle the outfit"
            onPress={onShuffle}
            disabled={outfit.length < 2}
          />
          <OutlineIconButton
            icon={wearing ? 'check_circle' : 'bookmark_border'}
            label={wearing ? 'Wearing this today' : 'Wear this today'}
            onPress={onWear}
            disabled={empty}
          />
        </View>
        <Text className="mt-[11px] font-mono text-[10.5px] text-ink-secondary">
          {wearing
            ? 'wearing this today · it stays until tomorrow'
            : 'changes every morning · shuffle any time'}
        </Text>
      </View>
    </View>
  );
}
