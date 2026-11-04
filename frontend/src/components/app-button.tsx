import * as Haptics from 'expo-haptics';
import { Platform, Text } from 'react-native';

import { themeColors } from '@/constants/theme';

import { AppIcon } from './app-icon';
import { PressableScale } from './pressable-scale';

type Variant = 'primary' | 'accent' | 'cream' | 'secondary' | 'ghostDark' | 'saved';

export type AppButtonProps = {
  label: string;
  /**
   * primary: ink, the main action on a light screen · accent: clay, only for
   * AI actions (Try it on, Analyse, Start free trial) · cream: the main
   * action on a dark screen · secondary: outlined · ghostDark: outlined on dark.
   * saved: the success tint a clay button turns into once done (Save to Looks).
   */
  variant?: Variant;
  /** Only meaningful on `variant="secondary"`: a destructive action (e.g. delete). */
  tone?: 'default' | 'destructive';
  /** A leading Material Symbols icon name. `accent` buttons may use "auto_awesome". */
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-inverse',
  accent: 'bg-primary',
  cream: 'bg-cream',
  secondary: 'border border-[rgba(22,19,15,0.12)] bg-surface',
  ghostDark: 'border border-[rgba(246,241,232,0.22)] bg-transparent',
  saved: 'bg-[rgba(62,143,99,0.2)]',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-ink-onPrimary',
  accent: 'text-ink-onPrimary',
  cream: 'text-ink-primary',
  secondary: 'text-ink-primary',
  ghostDark: 'text-night-text',
  saved: 'text-[#7FC49C]',
};

const ICON_COLOR: Record<Variant, string> = {
  primary: themeColors.background,
  accent: themeColors.background,
  cream: themeColors.inkPrimary,
  secondary: themeColors.inkPrimary,
  ghostDark: themeColors.nightText,
  saved: '#7FC49C',
};

const FILLED: Variant[] = ['primary', 'accent', 'cream'];

export function AppButton({
  label,
  variant = 'primary',
  tone = 'default',
  icon,
  onPress,
  disabled = false,
  accessibilityLabel,
}: AppButtonProps) {
  const filled = FILLED.includes(variant);
  const isDestructive = variant === 'secondary' && tone === 'destructive';

  const containerClassName = [
    'min-h-[52px] flex-row items-center justify-center gap-sm rounded-xl px-xl py-md',
    filled && disabled ? 'bg-neutral-200' : CONTAINER[variant],
    isDestructive ? 'border-error' : '',
    !filled && disabled && variant !== 'saved' ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelClassName = [
    'font-sans-bold text-[15px]',
    filled && disabled ? 'text-neutral-500' : isDestructive ? 'text-error' : LABEL[variant],
  ].join(' ');

  const iconColor =
    filled && disabled
      ? themeColors.neutral500
      : isDestructive
        ? themeColors.error
        : ICON_COLOR[variant];

  const handlePress = () => {
    // A light tap on the main actions; skipped on web, which has no haptics.
    if (filled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      className={containerClassName}
    >
      {icon ? <AppIcon name={icon} size="sm" color={iconColor} /> : null}
      <Text className={labelClassName}>{label}</Text>
    </PressableScale>
  );
}
