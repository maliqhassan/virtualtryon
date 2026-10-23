import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { themeColors } from '@/constants/theme';

import { PressableScale } from './pressable-scale';

export type AppScaffoldProps = {
  children: ReactNode;
  /** Set false for a screen that manages its own scroll (e.g. a list). */
  scroll?: boolean;
  /** Inside a tab: the tab bar already handles the bottom safe area. */
  inTabs?: boolean;
  /** Show a back button (stack screens). */
  back?: boolean;
};

function BackButton() {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <PressableScale
      onPress={goBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      containerClassName="mb-md self-start"
      className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 5l-7 7 7 7"
          stroke={themeColors.inkPrimary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </PressableScale>
  );
}

export function AppScaffold({
  children,
  scroll = true,
  inTabs = false,
  back = false,
}: AppScaffoldProps) {
  const content = (
    <>
      {back && <BackButton />}
      {children}
    </>
  );
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={inTabs ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
    >
      {scroll ? (
        <ScrollView
          className="flex-1 px-xl pt-lg"
          contentContainerClassName="pb-xxxl"
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
