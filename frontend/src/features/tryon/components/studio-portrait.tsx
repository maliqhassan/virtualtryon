import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { AppImage } from '@/components/app-image';
import { IconButton } from '@/components/icon-button';
import { StripeFill } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { HELP_HREF } from '@/features/account';
import { ADD_PORTRAIT_HREF, MY_PHOTO_HREF, displayUrl, usePortraits } from '@/features/my-photo';
import { selectionFeedback } from '@/lib/haptics';
import { CreditsPill, type Usage } from '@/features/usage';
import { resolveMediaUrl } from '@/lib/media-url';

import type { Piece } from './piece-tile';

/**
 * The top of the Try-On studio: the user's portrait, with back, info and
 * credits over it, "Change portrait", and a corner preview of the picked
 * piece. `height` is the part above the sheet's lower snap point.
 * "Change portrait" opens a row of the user's photos right here: tapping one
 * makes it the photo this and later try-ons use.
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
  const [choosing, setChoosing] = useState(false);
  const { ordered, inUseId, select, addHref } = usePortraits();
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
            onPress={() => router.push(ADD_PORTRAIT_HREF)}
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

      {portraitUri && !choosing && (
        <Pressable
          onPress={() => (ordered.length > 1 ? setChoosing(true) : router.push(ADD_PORTRAIT_HREF))}
          accessibilityRole="button"
          accessibilityLabel={ordered.length > 1 ? 'Change portrait' : 'Add another portrait'}
          className="absolute bottom-[42px] left-lg flex-row items-center gap-[7px] rounded-full bg-[rgba(22,19,15,0.72)] px-[14px] py-[9px]"
        >
          <AppIcon name="sync" size={16} color={themeColors.cream} />
          <Text className="font-sans-semibold text-[12.5px] text-cream">
            {ordered.length > 1 ? 'Change portrait' : 'Add another portrait'}
          </Text>
        </Pressable>
      )}

      {choosing && (
        <View className="absolute bottom-[34px] left-0 right-0 bg-[rgba(22,19,15,0.78)] py-sm">
          <View className="mb-xs flex-row items-center justify-between px-lg">
            <Text className="font-sans-semibold text-[12.5px] text-cream">Pick a portrait</Text>
            <Pressable onPress={() => setChoosing(false)} accessibilityRole="button" hitSlop={10}>
              <Text className="font-sans-bold text-[12.5px] text-gold-soft">Done</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-sm px-lg">
              {ordered.map((photo, index) => {
                const inUse = photo.id === inUseId;
                return (
                  <Pressable
                    key={photo.id}
                    onPress={() => {
                      selectionFeedback();
                      select(photo.id);
                      setChoosing(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: inUse }}
                    accessibilityLabel={`Portrait ${index + 1}${inUse ? ', in use' : ''}`}
                    className={`h-[76px] w-[57px] overflow-hidden rounded-[12px] border-2 ${inUse ? 'border-gold-soft' : 'border-transparent'}`}
                  >
                    <AppImage
                      uri={resolveMediaUrl(displayUrl(photo))}
                      accessibilityLabel=""
                      aspectRatio={3 / 4}
                      borderRadius={10}
                    />
                  </Pressable>
                );
              })}
              {addHref && (
                <Pressable
                  onPress={() => {
                    setChoosing(false);
                    router.push(addHref);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add or manage portraits"
                  className="h-[76px] w-[57px] items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-[rgba(246,241,232,0.4)]"
                >
                  <AppIcon name="add" size={22} color={themeColors.cream} />
                </Pressable>
              )}
            </View>
          </ScrollView>
          <Pressable
            onPress={() => {
              setChoosing(false);
              router.push(MY_PHOTO_HREF);
            }}
            accessibilityRole="link"
            className="mt-xs self-start px-lg"
          >
            <Text className="font-sans text-[11px] text-neutral-400">Manage portraits →</Text>
          </Pressable>
        </View>
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
            <Text className="px-xs text-center font-mono-semibold text-[11px] text-ink-secondary">
              pick a piece
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
