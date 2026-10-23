import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppImage } from '@/components/app-image';
import { AppScaffold } from '@/components/app-scaffold';
import { RenameModal } from '@/components/rename-modal';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import { confirmDestructiveAction } from '@/lib/confirm';
import { resolveMediaUrl } from '@/lib/media-url';

import { useDeleteSavedLook } from '../hooks/use-delete-saved-look';
import { useSavedLooksQuery } from '../hooks/use-saved-looks-query';
import { useUpdateSavedLook } from '../hooks/use-update-saved-look';
import { LOOKS_HREF } from '../routes';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function SavedLookDetailsScreen() {
  const { lookId } = useLocalSearchParams<{ lookId: string }>();
  // No single-item GET endpoint exists on the backend — this reads the
  // look out of the same list query's cache (useSavedLooksQuery uses the
  // same query key), rather than adding a backend endpoint for a
  // convenience the app doesn't strictly need. A cold-started deep link
  // (list never fetched yet) is handled the same way: the query below just
  // fetches for real, same as it would on the History screen.
  const savedLooksQuery = useSavedLooksQuery();
  const updateLook = useUpdateSavedLook();
  const deleteLook = useDeleteSavedLook();
  const [isRenaming, setIsRenaming] = useState(false);

  const look = savedLooksQuery.data?.find((item) => item.id === lookId);

  const handleDelete = async () => {
    if (!look) return;
    const confirmed = await confirmDestructiveAction('Delete this look?', 'This can’t be undone.');
    if (!confirmed) return;
    deleteLook.mutate(look.id, {
      onSuccess: () => router.back(),
    });
  };

  if (savedLooksQuery.isLoading) {
    return (
      <AppScaffold back scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading this look…" />
        </View>
      </AppScaffold>
    );
  }

  if (!look) {
    return (
      <AppScaffold back>
        <Text className="font-display text-[34px] leading-[38px] text-ink-primary">
          Look not found
        </Text>
        <Text className="mt-xs text-ink-secondary">This saved look may have been deleted.</Text>
        <Link href={LOOKS_HREF} className="mt-lg text-sm font-semibold text-primary">
          Back to History →
        </Link>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold back>
      <Text className="font-display text-[34px] leading-[38px] text-ink-primary">{look.title}</Text>
      <Text className="mt-xs text-sm text-ink-secondary">{formatDate(look.createdAt)}</Text>

      <View className="mt-lg gap-xs">
        <Text className="text-sm font-semibold text-ink-secondary">Result</Text>
        <AppImage
          uri={resolveMediaUrl(look.generatedImageUrl)}
          accessibilityLabel="Generated result"
          aspectRatio={1}
        />
      </View>

      <View className="mt-lg flex-row gap-sm">
        <View className="flex-1 gap-xs">
          <Text className="text-sm font-semibold text-ink-secondary">Before (you)</Text>
          <AppImage
            uri={resolveMediaUrl(look.userImageUrl)}
            accessibilityLabel="Your original photo"
          />
        </View>
        <View className="flex-1 gap-xs">
          <Text className="text-sm font-semibold text-ink-secondary">Before (garment)</Text>
          <AppImage
            uri={resolveMediaUrl(look.clothingImageUrl)}
            accessibilityLabel="The garment photo"
          />
        </View>
      </View>

      <View className="mt-xl gap-md">
        <AppButton
          label={look.isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}
          variant="secondary"
          onPress={() =>
            updateLook.mutate({ id: look.id, input: { isFavourite: !look.isFavourite } })
          }
        />
        <AppButton label="Rename" variant="secondary" onPress={() => setIsRenaming(true)} />
        <AppButton label="Delete" variant="secondary" tone="destructive" onPress={handleDelete} />
      </View>

      <RenameModal
        visible={isRenaming}
        title="Rename look"
        placeholder="Look title"
        initialValue={look.title}
        onCancel={() => setIsRenaming(false)}
        onSave={(title) => {
          updateLook.mutate({ id: look.id, input: { title } });
          setIsRenaming(false);
        }}
      />
    </AppScaffold>
  );
}
