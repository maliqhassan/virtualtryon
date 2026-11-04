import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { AppScaffold } from '@/components/app-scaffold';
import { ListCard, ListRow, ListSectionLabel } from '@/components/list-card';
import { ScreenHeader } from '@/components/screen-header';
import { themeColors } from '@/constants/theme';
import { MY_PHOTO_HREF } from '@/features/my-photo';
import { useOnboardingPreferences } from '@/features/onboarding';
import { confirmDestructiveAction } from '@/lib/confirm';
import { selectionFeedback } from '@/lib/haptics';

import { deleteAllMyData } from '../services/account-api';

const THEMES = ['System', 'Light', 'Dark'] as const;

/** Appearance, style and region, and privacy (including deleting everything). */
export function SettingsScreen() {
  const queryClient = useQueryClient();
  const styleFor = useOnboardingPreferences((state) => state.styleFor);
  const setStyleFor = useOnboardingPreferences((state) => state.setStyleFor);

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
    <AppScaffold back>
      <ScreenHeader title="Settings" />

      <ListSectionLabel>Appearance</ListSectionLabel>
      <View
        className="flex-row gap-xs rounded-[14px] bg-[#ECE8E1] p-xs"
        accessibilityRole="tablist"
      >
        {THEMES.map((theme) => {
          const on = theme === 'Light';
          return (
            <Pressable
              key={theme}
              onPress={() => {
                if (on) return;
                Alert.alert('Coming soon', `${theme} appearance arrives in an update.`);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className={`flex-1 items-center rounded-[11px] py-[10px] ${on ? 'bg-surface' : ''}`}
              style={on ? { boxShadow: '0px 2px 8px rgba(22, 19, 15, 0.08)' } : undefined}
            >
              <Text
                className={`font-sans-bold text-[12.5px] ${on ? 'text-ink-primary' : 'text-ink-secondary'}`}
              >
                {theme}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ListSectionLabel>Style &amp; region</ListSectionLabel>
      <ListCard>
        <ListRow
          label="Style me for"
          action={{ label: styleFor === 'men' ? 'Men' : 'Women', color: themeColors.neutral500 }}
          onPress={() => {
            selectionFeedback();
            setStyleFor(styleFor === 'men' ? 'women' : 'men');
          }}
          accessibilityLabel={`Style me for ${styleFor}. Tap to change`}
        />
        <ListRow label="Language" action={{ label: 'English', color: themeColors.neutral500 }} />
      </ListCard>

      <ListSectionLabel>Privacy</ListSectionLabel>
      <ListCard>
        <ListRow
          label="My photos"
          action={{ label: 'Manage' }}
          onPress={() => router.push(MY_PHOTO_HREF)}
        />
        <ListRow
          label={deleteData.isPending ? 'Deleting…' : 'Delete all my data'}
          action={{ label: 'Delete', color: themeColors.error }}
          onPress={deleteData.isPending ? undefined : handleDeleteAll}
        />
      </ListCard>
      {deleteData.isSuccess && (
        <Text className="mt-md font-sans text-[12px] text-success" accessibilityRole="alert">
          All your data has been deleted.
        </Text>
      )}
      {deleteData.isError && (
        <Text className="mt-md font-sans text-[12px] text-error" accessibilityRole="alert">
          Couldn’t delete your data. Please try again.
        </Text>
      )}
      <Text className="mt-md font-sans text-[11.5px] leading-[17px] text-ink-secondary">
        Your photo is only used to create your try-ons. Deleting your data removes your photo,
        wardrobe, saved looks and every image we stored.
      </Text>
    </AppScaffold>
  );
}
