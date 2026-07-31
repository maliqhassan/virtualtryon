import { FlatList, RefreshControl, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { ThinkingIndicator } from '@/components/thinking-indicator';

import { SavedLookCard } from '../components/saved-look-card';
import { useSavedLooksQuery } from '../hooks/use-saved-looks-query';
import { useUpdateSavedLook } from '../hooks/use-update-saved-look';
import type { SavedLook } from '../types';

export function SavedLooksHistoryScreen() {
  const savedLooksQuery = useSavedLooksQuery();
  const updateLook = useUpdateSavedLook();

  const handleToggleFavourite = (look: SavedLook) => {
    updateLook.mutate({ id: look.id, input: { isFavourite: !look.isFavourite } });
  };

  if (savedLooksQuery.isLoading) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading your saved looks…" />
        </View>
      </AppScaffold>
    );
  }

  if (savedLooksQuery.isError) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="text-lg font-semibold text-ink-primary">
            Couldn&rsquo;t load your saved looks
          </Text>
          <Text className="text-center text-sm text-ink-secondary">
            Check your connection and try again.
          </Text>
          <AppButton label="Retry" variant="secondary" onPress={() => savedLooksQuery.refetch()} />
        </View>
      </AppScaffold>
    );
  }

  const looks = savedLooksQuery.data ?? [];

  if (looks.length === 0) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="text-lg font-semibold text-ink-primary">No saved looks yet</Text>
          <Text className="text-center text-sm text-ink-secondary">
            Looks you save after a try-on will show up here.
          </Text>
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold scroll={false}>
      <Text className="mb-md text-2xl font-bold text-ink-primary">History</Text>
      <FlatList
        data={looks}
        keyExtractor={(look) => look.id}
        renderItem={({ item }) => (
          <SavedLookCard look={item} onToggleFavourite={handleToggleFavourite} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={savedLooksQuery.isRefetching}
            onRefresh={() => savedLooksQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </AppScaffold>
  );
}
