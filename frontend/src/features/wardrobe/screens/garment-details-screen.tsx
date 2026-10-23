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

import { CategoryPickerModal } from '../components/category-picker-modal';
import { useDeleteGarment } from '../hooks/use-delete-garment';
import { useGarmentsQuery } from '../hooks/use-garments-query';
import { useUpdateGarment } from '../hooks/use-update-garment';
import { WARDROBE_HREF } from '../routes';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function GarmentDetailsScreen() {
  const { garmentId } = useLocalSearchParams<{ garmentId: string }>();
  // No single-item GET endpoint on the backend — same precedent as
  // saved-look-details-screen.tsx: read the garment out of the list
  // query's cache rather than adding a backend endpoint for convenience.
  const garmentsQuery = useGarmentsQuery();
  const updateGarment = useUpdateGarment();
  const deleteGarment = useDeleteGarment();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

  const garment = garmentsQuery.data?.find((item) => item.id === garmentId);

  const handleDelete = async () => {
    if (!garment) return;
    const confirmed = await confirmDestructiveAction(
      'Delete this garment?',
      'This can’t be undone.',
    );
    if (!confirmed) return;
    deleteGarment.mutate(garment.id, {
      onSuccess: () => router.back(),
    });
  };

  if (garmentsQuery.isLoading) {
    return (
      <AppScaffold back scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading this garment…" />
        </View>
      </AppScaffold>
    );
  }

  if (!garment) {
    return (
      <AppScaffold back>
        <Text className="font-display text-[34px] leading-[38px] text-ink-primary">
          Garment not found
        </Text>
        <Text className="mt-xs text-ink-secondary">This garment may have been deleted.</Text>
        <Link href={WARDROBE_HREF} className="mt-lg text-sm font-semibold text-primary">
          Back to Wardrobe →
        </Link>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold back>
      <Text className="font-display text-[34px] leading-[38px] text-ink-primary">
        {garment.title}
      </Text>
      <Text className="mt-xs text-sm text-ink-secondary">{garment.category}</Text>
      <Text className="mt-xs text-sm text-ink-secondary">
        Added {formatDate(garment.createdAt)}
      </Text>

      <View className="mt-lg gap-xs">
        <AppImage
          uri={resolveMediaUrl(garment.imageUrl)}
          accessibilityLabel={garment.title}
          aspectRatio={1}
        />
      </View>

      <View className="mt-xl gap-md">
        <AppButton label="Rename" variant="secondary" onPress={() => setIsRenaming(true)} />
        <AppButton
          label="Change Category"
          variant="secondary"
          onPress={() => setIsCategoryPickerOpen(true)}
        />
        <AppButton label="Delete" variant="secondary" tone="destructive" onPress={handleDelete} />
      </View>

      <RenameModal
        visible={isRenaming}
        title="Rename garment"
        placeholder="Garment title"
        initialValue={garment.title}
        onCancel={() => setIsRenaming(false)}
        onSave={(title) => {
          updateGarment.mutate({ id: garment.id, input: { title } });
          setIsRenaming(false);
        }}
      />

      <CategoryPickerModal
        visible={isCategoryPickerOpen}
        selected={garment.category}
        onCancel={() => setIsCategoryPickerOpen(false)}
        onSelect={(category) => {
          updateGarment.mutate({ id: garment.id, input: { category } });
          setIsCategoryPickerOpen(false);
        }}
      />
    </AppScaffold>
  );
}
