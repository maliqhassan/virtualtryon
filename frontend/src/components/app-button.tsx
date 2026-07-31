import { Pressable, Text } from 'react-native';

export type AppButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary';
  /** Only meaningful on `variant="secondary"` — signals a destructive action (e.g. delete). */
  tone?: 'default' | 'destructive';
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

// Scoped to the primary/secondary variants this app currently uses.
// The full spec (design/react-native/02-component-inventory.md) also has an
// `accent` variant and a Reanimated press-scale animation — deferred until a
// screen actually needs them, not built speculatively.
export function AppButton({
  label,
  variant = 'primary',
  tone = 'default',
  onPress,
  disabled = false,
  accessibilityLabel,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const isDestructive = !isPrimary && tone === 'destructive';

  const containerClassName = [
    'min-h-[48px] items-center justify-center rounded-xl px-xl py-md',
    isPrimary
      ? disabled
        ? 'bg-neutral-300'
        : 'bg-primary'
      : ['border bg-transparent', isDestructive ? 'border-error' : 'border-border'].join(' '),
    !isPrimary && disabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelClassName = [
    'text-base font-bold',
    isPrimary
      ? disabled
        ? 'text-neutral-500'
        : 'text-ink-onPrimary'
      : isDestructive
        ? 'text-error'
        : 'text-ink-primary',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      className={containerClassName}
    >
      <Text className={labelClassName}>{label}</Text>
    </Pressable>
  );
}
