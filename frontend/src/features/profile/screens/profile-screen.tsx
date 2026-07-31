import { router } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { ThinkingIndicator } from '@/components/thinking-indicator';

import { useProfileQuery } from '../hooks/use-profile-query';
import { EDIT_PROFILE_HREF } from '../routes';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-border py-sm">
      <Text className="text-sm text-ink-secondary">{label}</Text>
      <Text className="text-sm font-semibold text-ink-primary">{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const profileQuery = useProfileQuery();

  if (profileQuery.isLoading) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading your profile…" />
        </View>
      </AppScaffold>
    );
  }

  if (profileQuery.isError) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="text-lg font-semibold text-ink-primary">
            Couldn&rsquo;t load your profile
          </Text>
          <Text className="text-center text-sm text-ink-secondary">
            Check your connection and try again.
          </Text>
          <AppButton label="Retry" variant="secondary" onPress={() => profileQuery.refetch()} />
        </View>
      </AppScaffold>
    );
  }

  const profile = profileQuery.data;

  if (!profile) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center gap-md">
          <Text className="text-lg font-semibold text-ink-primary">
            You haven&rsquo;t added your measurements yet
          </Text>
          <Text className="text-center text-sm text-ink-secondary">
            Add your height, weight, and other details to help with fit and sizing.
          </Text>
          <AppButton
            label="Create Profile"
            variant="primary"
            onPress={() => router.push(EDIT_PROFILE_HREF)}
          />
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold scroll={false}>
      <View className="mb-md flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-ink-primary">Profile</Text>
        <AppButton
          label="Edit"
          variant="secondary"
          onPress={() => router.push(EDIT_PROFILE_HREF)}
        />
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching}
            onRefresh={() => profileQuery.refetch()}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Row label="Display name" value={profile.displayName ?? '—'} />
        <Row label="Age" value={profile.age !== null ? String(profile.age) : '—'} />
        <Row label="Gender" value={profile.gender ?? '—'} />
        <Row label="Height" value={`${profile.heightCm} cm`} />
        <Row label="Weight" value={`${profile.weightKg} kg`} />
        <Row label="Body type" value={profile.bodyType ?? '—'} />
        <Row label="Preferred fit" value={profile.preferredFit ?? '—'} />
      </ScrollView>
    </AppScaffold>
  );
}
