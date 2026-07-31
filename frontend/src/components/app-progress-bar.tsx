import { View } from 'react-native';

export type AppProgressBarProps = {
  /** 0-100. Values outside that range are clamped. */
  value: number;
  variant?: 'primary' | 'neutral';
};

// Scoped to the two variants currently needed (functional progress, e.g.
// upload progress). The full spec (design/react-native/02-component-inventory.md)
// also has `accent` (gold) and `success` (green) fills — reserved in the
// source design for scores and celebratory moments, not a general-purpose
// progress bar, so not built until a screen that actually needs them.
export function AppProgressBar({ value, variant = 'primary' }: AppProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
      <View
        className={variant === 'primary' ? 'h-full bg-primary' : 'h-full bg-ink-primary'}
        style={{ width: `${clamped}%` }}
      />
    </View>
  );
}
