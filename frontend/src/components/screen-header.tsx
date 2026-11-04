import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { FadeInView } from './fade-in-view';

type ScreenHeaderProps = {
  title: string;
  /**
   * tab: Manrope bold 28, for tab screens and most pushed screens ·
   * editorial: Instrument Serif, for greetings and editorial moments.
   */
  variant?: 'tab' | 'editorial';
  /** Editorial only: a second title line in italic (the "gold accent" line). */
  italic?: string;
  /** Put the italic words on the same line as the title ("Try it *on.*"). */
  italicInline?: boolean;
  /** Mono overline above the title. */
  eyebrow?: string;
  subtitle?: string;
  /** Shown on the right of the title row (icon buttons or a pill). */
  right?: ReactNode;
  /** Draws on the dark stage (night background). */
  dark?: boolean;
};

export function ScreenHeader({
  title,
  variant = 'tab',
  italic,
  italicInline = false,
  eyebrow,
  subtitle,
  right,
  dark = false,
}: ScreenHeaderProps) {
  const titleColor = dark ? 'text-night-text' : 'text-ink-primary';
  return (
    <FadeInView className="mb-lg">
      <View className="flex-row items-end justify-between gap-md">
        <View className="flex-1">
          {eyebrow && (
            <Text
              className={`mb-[6px] font-mono text-[10px] uppercase tracking-[1.6px] ${
                dark ? 'text-gold-overline' : 'text-primary'
              }`}
            >
              {eyebrow}
            </Text>
          )}
          {variant === 'tab' ? (
            <Text
              className={`font-sans-bold text-[28px] leading-[34px] tracking-[-0.56px] ${titleColor}`}
              accessibilityRole="header"
            >
              {title}
            </Text>
          ) : (
            <Text
              className={`font-display text-[34px] leading-[36px] ${titleColor}`}
              accessibilityRole="header"
            >
              {title}
              {italic ? (
                <Text
                  className={`font-display-italic ${dark ? 'text-gold-soft' : 'text-ink-primary'}`}
                >
                  {italicInline ? ` ${italic}` : `\n${italic}`}
                </Text>
              ) : null}
            </Text>
          )}
        </View>
        {right}
      </View>
      {subtitle && (
        <Text
          className={`mt-sm font-sans text-[13px] leading-[20px] ${
            dark ? 'text-night-body' : 'text-ink-secondary'
          }`}
        >
          {subtitle}
        </Text>
      )}
    </FadeInView>
  );
}
