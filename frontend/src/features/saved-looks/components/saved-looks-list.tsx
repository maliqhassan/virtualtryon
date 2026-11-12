import { FlatList, RefreshControl, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FadeInView } from '@/components/fade-in-view';
import { ThinkingIndicator } from '@/components/thinking-indicator';

import { useSavedLooksQuery } from '../hooks/use-saved-looks-query';
import { useUpdateSavedLook } from '../hooks/use-update-saved-look';
import type { SavedLook } from '../types';

import { SavedLookCard } from './saved-look-card';

/**
 * The user's saved try-ons, newest first, with favourites and pull to
 * refresh. Wardrobe's Outfits tab (handoff v2.1 change 7); it replaced the
 * separate Looks screen. Fills its parent.
 */
export function SavedLooksList() {
  const savedLooksQuery = useSavedLooksQuery();
  const updateLook = useUpdateSavedLook();

  const handleToggleFavourite = (look: SavedLook) => {
    updateLook.mutate({ id: look.id, input: { isFavourite: !look.isFavourite } });
  };

  if (savedLooksQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ThinkingIndicator step="Loading your saved looks…" />
      </View>
    );
  }

  if (savedLooksQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-md">
        <Text className="font-sans-semibold text-lg text-ink-primary">
          Couldn&rsquo;t load your saved looks
        </Text>
        <Text className="text-center font-sans text-sm text-ink-secondary">
          Check your connection and try again.
        </Text>
        <AppButton label="Retry" variant="secondary" onPress={() => savedLooksQuery.refetch()} />
      </View>
    );
  }

  const looks = savedLooksQuery.data ?? [];

  if (looks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-md">
        <Text className="font-display text-3xl text-ink-primary">No saved looks yet</Text>
        <Text className="text-center font-sans text-sm text-ink-secondary">
          Try something on, then tap Save to keep it here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={looks}
      keyExtractor={(look) => look.id}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <FadeInView index={index}>
          <SavedLookCard look={item} onToggleFavourite={handleToggleFavourite} />
        </FadeInView>
      )}
      refreshControl={
        <RefreshControl
          refreshing={savedLooksQuery.isRefetching}
          onRefresh={() => savedLooksQuery.refetch()}
        />
      }
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
