import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { FadeInView } from './fade-in-view';

type ScreenHeaderProps = {
  title: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  subtitle?: string;
  /** Shown on the right of the title row (a button or a pill). */
  right?: ReactNode;
};

/** Editorial screen title: serif display face, with an optional eyebrow and subtitle. */
export function ScreenHeader({ title, eyebrow, subtitle, right }: ScreenHeaderProps) {
  return (
    <FadeInView className="mb-lg">
      {eyebrow && (
        <Text className="mb-xs text-xs font-bold uppercase tracking-widest text-primary">
          {eyebrow}
        </Text>
      )}
      <View className="flex-row items-end justify-between gap-md">
        <Text
          className="flex-1 font-display text-[38px] leading-[42px] text-ink-primary"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {right}
      </View>
      {subtitle && (
        <Text className="mt-xs text-[15px] leading-[22px] text-ink-secondary">{subtitle}</Text>
      )}
    </FadeInView>
  );
}
