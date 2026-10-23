import { FlatList, RefreshControl, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { ScreenHeader } from '@/components/screen-header';
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
      <AppScaffold inTabs scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading your saved looks…" />
        </View>
      </AppScaffold>
    );
  }

  if (savedLooksQuery.isError) {
    return (
      <AppScaffold inTabs scroll={false}>
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
      <AppScaffold inTabs scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="font-display text-3xl text-ink-primary">No saved looks yet</Text>
          <Text className="text-center text-sm text-ink-secondary">
            Try something on, then tap “Save to Looks” to keep it here.
          </Text>
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold inTabs scroll={false}>
      <ScreenHeader eyebrow="Saved try-ons" title="Looks" />
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
    </AppScaffold>
  );
}
