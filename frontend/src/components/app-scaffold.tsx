import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTabBarSpace } from './floating-tab-bar';
import { IconButton } from './icon-button';
import { ScreenStatusBar } from './screen-status-bar';

export type AppScaffoldProps = {
  children: ReactNode;
  /** Set false for a screen that manages its own scroll (e.g. a list). */
  scroll?: boolean;
  /** Inside a tab: the floating tab bar covers the bottom, so a scrolling
   * screen leaves room for it (lists in `scroll={false}` screens pad
   * themselves with useTabBarSpace). */
  inTabs?: boolean;
  /** Show a back button (stack screens). */
  back?: boolean;
  /** The dark stage: night background and light status bar. */
  dark?: boolean;
};

function BackButton({ dark }: { dark: boolean }) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View className="mb-md self-start">
      <IconButton
        icon="arrow_back"
        tone={dark ? 'glass' : 'light'}
        accessibilityLabel="Go back"
        onPress={goBack}
      />
    </View>
  );
}

export function AppScaffold({
  children,
  scroll = true,
  inTabs = false,
  back = false,
  dark = false,
}: AppScaffoldProps) {
  const tabBarSpace = useTabBarSpace();
  const content = (
    <>
      {back && <BackButton dark={dark} />}
      {children}
    </>
  );
  return (
    <SafeAreaView
      className={`flex-1 ${dark ? 'bg-night' : 'bg-background'}`}
      edges={inTabs ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      {dark && <ScreenStatusBar style="light" />}
      {scroll ? (
        <ScrollView
          className="flex-1 px-xl pt-lg"
          contentContainerClassName={inTabs ? undefined : 'pb-xxxl'}
          contentContainerStyle={inTabs ? { paddingBottom: tabBarSpace } : undefined}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View className="flex-1 px-xl pt-lg">{content}</View>
      )}
    </SafeAreaView>
  );
}
