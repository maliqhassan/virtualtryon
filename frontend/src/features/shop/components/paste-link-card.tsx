import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
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
    <View className="mb-xl gap-md rounded-xxl border border-border bg-surface p-lg">
      <View className="gap-xs">
        <Text className="text-lg font-bold text-ink-primary">Try on from any store</Text>
        <Text className="text-sm text-ink-secondary">
          Open a product in your browser, copy its link and paste it here.
        </Text>
      </View>

      <View className="flex-row items-center rounded-full border border-border bg-background px-lg">
        <TextInput
          value={link}
          onChangeText={(text) => {
            setLink(text);
            if (importLink.isError) importLink.reset();
            if (startTryOn.isError) startTryOn.reset();
          }}
          placeholder="https://store.com/product…"
          placeholderTextColor={themeColors.neutral500}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleTryOn}
          editable={!busy}
          accessibilityLabel="Product link"
          className="flex-1 py-md text-base text-ink-primary"
        />
        {link.length > 0 ? (
          <Pressable
            onPress={() => setLink('')}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Clear link"
            hitSlop={10}
          >
            <Text className="text-lg text-ink-secondary">×</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePaste}
            accessibilityRole="button"
            accessibilityLabel="Paste link"
            hitSlop={10}
          >
            <Text className="text-sm font-bold text-primary">Paste</Text>
          </Pressable>
        )}
      </View>

      {busy && (
        <Text className="text-sm text-ink-secondary" accessibilityLiveRegion="polite">
          {importLink.isPending ? 'Finding the product…' : 'Starting your try-on…'}
        </Text>
      )}
      {errorText && !busy && (
        <Text className="text-sm text-error" accessibilityRole="alert">
          {errorText}
        </Text>
      )}

      <AppButton
        label={busy ? 'Working…' : 'Try it on'}
        variant="dark"
        onPress={handleTryOn}
        disabled={!url || busy}
      />
    </View>
  );
}
