import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { ScreenHeader } from '@/components/screen-header';
import { MY_PHOTO_HREF, displayUrl, useMyPhotoQuery } from '@/features/my-photo';
import { UPGRADE_HREF, describeUsage, useUsageQuery } from '@/features/usage';
import { confirmDestructiveAction } from '@/lib/confirm';
import { resolveMediaUrl } from '@/lib/media-url';

import { deleteAllMyData } from '../services/account-api';

const PLAN_NAMES = { free: 'Free', pro: 'Pro', pro_plus: 'Pro Plus' } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-xl">
      <Text className="mb-sm text-xs font-bold uppercase tracking-widest text-ink-secondary">
        {title}
      </Text>
      <View className="rounded-xxl border border-border bg-surface p-lg">{children}</View>
    </View>
  );
}

export function AccountScreen() {
  const queryClient = useQueryClient();
  const photoQuery = useMyPhotoQuery();
  const usageQuery = useUsageQuery();
  const usage = usageQuery.data;
  const photo = photoQuery.data ?? null;

  const deleteData = useMutation({
    mutationFn: deleteAllMyData,
    // Everything cached is now stale (photo, wardrobe, looks, usage).
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const handleDeleteAll = async () => {
    const confirmed = await confirmDestructiveAction(
      'Delete all your data?',
      'This removes your photo, wardrobe, saved looks and every image from our servers. It can’t be undone.',
      'Delete everything',
    );
    if (confirmed) deleteData.mutate();
  };

  return (
    <AppScaffold inTabs>
      <ScreenHeader eyebrow="Your account" title="Account" />

      <Section title="My photo">
        <Pressable
          onPress={() => router.push(MY_PHOTO_HREF)}
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Change your photo' : 'Add your photo'}
          className="flex-row items-center gap-md"
        >
          <View className="w-12">
            <AppImage
              uri={photo ? resolveMediaUrl(displayUrl(photo)) : null}
              accessibilityLabel="Your photo"
              aspectRatio={3 / 4}
              borderRadius={6}
              placeholderText="None"
            />
          </View>
          <Text className="flex-1 text-base text-ink-primary">
            {photo ? 'Your full-body photo' : 'No photo added yet'}
          </Text>
          <Text className="text-sm font-semibold text-primary">{photo ? 'Change' : 'Add'}</Text>
        </Pressable>
      </Section>

      <Section title="Plan">
        <Text className="text-lg font-bold text-ink-primary">
          {usage ? PLAN_NAMES[usage.plan] : '…'}
        </Text>
        {usage && <Text className="mt-xxs text-sm text-ink-secondary">{describeUsage(usage)}</Text>}
        <View className="mt-md">
          <AppButton
            label={usage?.plan === 'pro_plus' ? 'View plans' : 'Upgrade'}
            variant={usage && usage.remaining <= 0 ? 'primary' : 'secondary'}
            onPress={() => router.push(UPGRADE_HREF)}
          />
        </View>
      </Section>

      <Section title="Privacy">
        <Text className="text-sm text-ink-secondary">
          Your photo is only used to create your try-ons, and you can delete it at any time.
        </Text>
        <View className="mt-md">
          <AppButton
            label={deleteData.isPending ? 'Deleting…' : 'Delete all my data'}
            variant="secondary"
            tone="destructive"
            onPress={handleDeleteAll}
            disabled={deleteData.isPending}
          />
        </View>
        {deleteData.isSuccess && (
          <Text className="mt-sm text-sm text-success" accessibilityLiveRegion="polite">
            Your data has been deleted.
          </Text>
        )}
        {deleteData.isError && (
          <Text className="mt-sm text-sm text-error" accessibilityRole="alert">
            Couldn’t delete your data. Please try again.
          </Text>
        )}
      </Section>

      <Text className="mt-xl text-center text-xs text-ink-secondary">VirtualTryOn · v1.0.0</Text>
    </AppScaffold>
  );
}
