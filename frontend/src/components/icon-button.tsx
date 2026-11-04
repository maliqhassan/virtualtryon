import { themeColors } from '@/constants/theme';

import { AppIcon } from './app-icon';
import { PressableScale } from './pressable-scale';

type IconButtonProps = {
  /** Material Symbols name. */
  icon: string;
  /** Required: an icon alone needs a spoken name. */
  accessibilityLabel: string;
  onPress: () => void;
  /** light: white with a hairline border · ink: filled · glass: on photos and dark screens. */
  tone?: 'light' | 'ink' | 'glass';
  /** 42 in headers (the default), 36 inside cards. */
  size?: 42 | 36;
  disabled?: boolean;
};

const TONE = {
  light: 'border border-[rgba(22,19,15,0.1)] bg-surface',
  ink: 'bg-inverse',
  glass: 'border border-[rgba(255,255,255,0.18)] bg-[rgba(28,26,23,0.55)]',
} as const;

/** A round icon-only button: header actions such as search, add, share and back. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'light',
  size = 42,
  disabled = false,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedScale={0.92}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={6}
      className={`items-center justify-center rounded-full ${TONE[tone]} ${disabled ? 'opacity-50' : ''}`}
      style={{ width: size, height: size }}
    >
      <AppIcon
        name={icon}
        size={size === 42 ? 'md' : 'sm'}
        color={tone === 'light' ? themeColors.inkPrimary : themeColors.background}
      />
    </PressableScale>
  );
}
