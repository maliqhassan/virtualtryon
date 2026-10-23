import * as Haptics from 'expo-haptics';
import { Platform, Text } from 'react-native';

import { PressableScale } from './pressable-scale';

export type AppButtonProps = {
  label: string;
  /** primary: clay call to action · dark: ink, for the main action on a screen · secondary: outlined. */
  variant?: 'primary' | 'dark' | 'secondary';
  /** Only meaningful on `variant="secondary"` — signals a destructive action (e.g. delete). */
  tone?: 'default' | 'destructive';
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function AppButton({
  label,
  variant = 'primary',
  tone = 'default',
  onPress,
  disabled = false,
  accessibilityLabel,
}: AppButtonProps) {
  const filled = variant !== 'secondary';
  const isDestructive = !filled && tone === 'destructive';

  const containerClassName = [
    'min-h-[52px] items-center justify-center rounded-full px-xl py-md',
    filled
      ? disabled
        ? 'bg-neutral-200'
        : variant === 'dark'
          ? 'bg-inverse'
          : 'bg-primary'
      : ['border bg-surface', isDestructive ? 'border-error' : 'border-border'].join(' '),
    !filled && disabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelClassName = [
    'text-base font-bold',
    filled
      ? disabled
        ? 'text-neutral-500'
        : 'text-ink-onPrimary'
      : isDestructive
        ? 'text-error'
        : 'text-ink-primary',
  ].join(' ');

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
      <Text className={labelClassName}>{label}</Text>
    </PressableScale>
  );
}
