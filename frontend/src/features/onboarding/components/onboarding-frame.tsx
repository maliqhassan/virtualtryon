import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/gradient-fill';

type OnboardingFrameProps = {
  children: ReactNode;
  /** Pinned to the bottom over a fade, like the design's sticky buttons. */
  footer?: ReactNode;
  dark?: boolean;
  /** Set false for screens that lay out to the full height themselves. */
  scroll?: boolean;
  /** Drawn behind everything (a glow or a full-bleed image). */
  backdrop?: ReactNode;
};

/** The shared page for onboarding and sign-in steps: 22px gutters, a sticky footer. */
export function OnboardingFrame({
  children,
  footer,
  dark = false,
  scroll = true,
  backdrop,
}: OnboardingFrameProps) {
  const stage = dark ? '#12110F' : '#F6F4F0';
  return (
    <View className="flex-1" style={{ backgroundColor: stage }}>
      {backdrop}
      <StatusBar style={dark ? 'light' : 'dark'} />
      <SafeAreaView className="flex-1" edges={['top', 'bottom', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-[22px] pt-lg pb-xxl"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1 px-[22px] pt-lg">{children}</View>
        )}
        {footer && (
          <View className="px-[22px] pb-lg pt-md">
            <View className="absolute -top-xxl left-0 right-0 h-xxl" pointerEvents="none">
              <GradientFill
                kind="linear"
                stops={[
                  { offset: 0, color: stage, opacity: 0 },
                  { offset: 1, color: stage },
                ]}
              />
            </View>
            {footer}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
