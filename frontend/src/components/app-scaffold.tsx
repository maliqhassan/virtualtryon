import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type AppScaffoldProps = {
  children: ReactNode;
  /** Set false for a screen that manages its own scroll (e.g. a list). */
  scroll?: boolean;
};

export function AppScaffold({ children, scroll = true }: AppScaffoldProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView className="flex-1 px-xl pt-lg" contentContainerClassName="pb-xxl">
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-xl pt-lg">{children}</View>
      )}
    </SafeAreaView>
  );
}
