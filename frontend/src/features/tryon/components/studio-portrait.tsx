import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { IconButton } from '@/components/icon-button';
import { StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { HELP_HREF } from '@/features/account';
import { MY_PHOTO_HREF, addPortraitHref } from '@/features/my-photo';
import { CreditsPill, type Usage } from '@/features/usage';
import { resolveMediaUrl } from '@/lib/media-url';

import type { Piece } from './piece-tile';

/**
 * The top of the Try-On studio: the user's portrait, with back, info and
 * credits over it, "Change portrait", and a corner preview of the picked
 * piece. `height` is the part above the sheet's lower snap point.
 */
export function StudioPortrait({
  height,
  portraitUri,
  piece,
  usage,
}: {
  height: number;
  portraitUri: string | null;
  piece: Piece | null;
  usage: Usage | undefined;
}) {
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/'));

  return (
    <View style={{ height }} className="overflow-hidden bg-muted">
      {portraitUri ? (
        <Image
          source={{ uri: portraitUri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          contentPosition="top"
          accessibilityLabel="Your portrait"
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-md">
          <StripeFill tone="warm" />
          <Pressable
            onPress={() => router.push(addPortraitHref('front'))}
            accessibilityRole="button"
            className="flex-row items-center gap-sm rounded-full bg-inverse px-lg py-md"
          >
            <AppIcon name="add_a_photo" size={18} color={themeColors.goldSoft} />
            <Text className="font-sans-bold text-[13px] text-ink-onPrimary">Add your portrait</Text>
          </Pressable>
        </View>
      )}

      <View
        className="absolute left-lg right-lg flex-row items-center justify-between"
        style={{ top: insets.top + 8 }}
      >
        <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={goBack} />
        <View className="flex-row items-center gap-sm">
          <IconButton
            icon="info"
            accessibilityLabel="How try-on works"
            onPress={() => router.push(HELP_HREF)}
          />
          {usage && <CreditsPill usage={usage} />}
        </View>
      </View>

      {portraitUri && (
        <Pressable
          onPress={() => router.push(MY_PHOTO_HREF)}
          accessibilityRole="button"
          accessibilityLabel="Change portrait"
          className="absolute bottom-[42px] left-lg flex-row items-center gap-[7px] rounded-full bg-[rgba(22,19,15,0.72)] px-[14px] py-[9px]"
        >
          <AppIcon name="sync" size={16} color={themeColors.cream} />
          <Text className="font-sans-semibold text-[12.5px] text-cream">Change portrait</Text>
        </Pressable>
      )}

      <View
        className="absolute bottom-[40px] right-lg h-[94px] w-[74px] overflow-hidden rounded-[16px] border-[2.5px] border-surface bg-surface"
        style={{ boxShadow: '0px 8px 20px rgba(22, 19, 15, 0.18)' }}
        accessibilityLabel={piece ? `Picked: ${piece.title}` : 'No piece picked yet'}
      >
        {piece ? (
          <AppImage
            uri={resolveMediaUrl(piece.imageUrl)}
            accessibilityLabel=""
            aspectRatio={74 / 94}
            borderRadius={12}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-muted">
            <Text className="px-xs text-center font-mono-semibold text-[8px] text-ink-secondary">
              pick a piece
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
