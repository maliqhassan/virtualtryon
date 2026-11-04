import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { themeColors } from '@/constants/theme';
import { MY_PHOTO_HREF, useMyPhotoQuery } from '@/features/my-photo';
import {
  MissingPhotoError,
  TryOnLimitReachedError,
  tryOnJobHref,
  useStartTryOn,
} from '@/features/tryon';
import { UPGRADE_HREF, useUsageQuery } from '@/features/usage';
import { useImportFromLink } from '@/features/wardrobe';

/**
 * "Try on from any store": the user copies a product link in their own
 * browser and pastes it here. The server finds the product and its photo,
 * keeps it in the user's wardrobe, and the usual try-on starts.
 */
export function PasteLinkCard() {
  const [link, setLink] = useState('');
  // The item already made from this link, so trying again after a failed
  // start doesn't import (and count) the same link twice.
  const [imported, setImported] = useState<{ url: string; garmentId: string } | null>(null);
  const photoQuery = useMyPhotoQuery();
  const usageQuery = useUsageQuery();
  const importLink = useImportFromLink();
  const startTryOn = useStartTryOn();

  const busy = importLink.isPending || startTryOn.isPending;
  const url = link.trim();

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setLink(text.trim());
  };

  const handleTryOn = () => {
    if (!url || busy) return;
    if (photoQuery.isSuccess && !photoQuery.data) {
      router.push(MY_PHOTO_HREF);
      return;
    }
    if (usageQuery.data && usageQuery.data.remaining <= 0) {
      router.push(UPGRADE_HREF);
      return;
    }
    const start = (garmentId: string) =>
      startTryOn.mutate(
        { garmentId },
        {
          onSuccess: (job) => {
            setLink('');
            setImported(null);
            importLink.reset();
            router.push(tryOnJobHref(job.id));
          },
          onError: (error) => {
            if (error instanceof TryOnLimitReachedError) router.push(UPGRADE_HREF);
            else if (error instanceof MissingPhotoError) router.push(MY_PHOTO_HREF);
          },
        },
      );
    if (imported?.url === url) {
      start(imported.garmentId);
      return;
    }
    importLink.mutate(url, {
      onSuccess: (garment) => {
        setImported({ url, garmentId: garment.id });
        start(garment.id);
      },
      onError: (error) => {
        if (error.code === 'limit_reached') router.push(UPGRADE_HREF);
      },
    });
  };

  const importError =
    importLink.error && importLink.error.code !== 'limit_reached' ? importLink.error.message : null;
  const startError =
    startTryOn.error &&
    !(startTryOn.error instanceof TryOnLimitReachedError) &&
    !(startTryOn.error instanceof MissingPhotoError)
      ? startTryOn.error.message
      : null;
  const errorText = importError ?? startError;

  return (
    <View className="mt-lg">
      <View className="flex-row items-center gap-[10px] rounded-[18px] border border-[rgba(22,19,15,0.1)] bg-surface py-[6px] pl-[14px] pr-[6px]">
        <AppIcon name="link" size={19} color={themeColors.neutral400} />
        <TextInput
          value={link}
          onChangeText={(text) => {
            setLink(text);
            if (importLink.isError) importLink.reset();
            if (startTryOn.isError) startTryOn.reset();
          }}
          placeholder="Paste a link from any store"
          placeholderTextColor={themeColors.neutral400}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleTryOn}
          editable={!busy}
          accessibilityLabel="Product link"
          className="flex-1 py-sm font-sans text-[13.5px] text-ink-primary"
        />
        {link.length > 0 && !busy && (
          <Pressable
            onPress={() => setLink('')}
            accessibilityRole="button"
            accessibilityLabel="Clear link"
            hitSlop={10}
          >
            <AppIcon name="close" size="sm" color={themeColors.inkSecondary} />
          </Pressable>
        )}
        <Pressable
          onPress={url ? handleTryOn : handlePaste}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={url ? 'Try it on' : 'Paste link'}
          className={`rounded-[13px] px-[14px] py-[10px] ${busy ? 'bg-neutral-300' : 'bg-inverse'}`}
        >
          <Text className="font-sans-bold text-[12.5px] text-ink-onPrimary">
            {busy ? 'Working…' : url ? 'Try on' : 'Paste'}
          </Text>
        </Pressable>
      </View>

      {busy && (
        <Text
          className="mt-sm font-sans text-[12.5px] text-ink-secondary"
          accessibilityLiveRegion="polite"
        >
          {importLink.isPending ? 'Finding the product…' : 'Starting your try-on…'}
        </Text>
      )}
      {errorText && !busy && (
        <Text className="mt-sm font-sans text-[12.5px] text-error" accessibilityRole="alert">
          {errorText}
        </Text>
      )}
      {!busy && !errorText && (
        <Text className="mt-sm font-sans text-[11.5px] text-ink-secondary">
          Copy a product link in your browser, paste it here, and see it on you.
        </Text>
      )}
    </View>
  );
}
