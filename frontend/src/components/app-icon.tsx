import { isLoaded } from 'expo-font';
import { type ColorValue, Text, View } from 'react-native';

import { themeColors } from '@/constants/theme';

/** The name the icon font is loaded under in app/_layout.tsx. */
const ICON_FONT = 'MaterialSymbolsRounded';

/** The design system's icon sizes (design_handoff_ai_stylist/01-foundation.md §8). */
const SIZES = {
  xs: 15, // inline with mono or caption text, check marks in lists
  sm: 18, // in-card affordances, chevrons
  md: 20, // list rows, input adornments, back arrows
  lg: 22, // tab bar, header actions, feature-card icons
  xl: 28, // empty states, sheet option cards, hero moments
} as const;

export type IconSize = keyof typeof SIZES;

type AppIconProps = {
  /** A Material Symbols ligature name, e.g. "arrow_back" or "auto_awesome". */
  name: string;
  /** A design-system size, or an exact number for the rare in-between case. */
  size?: IconSize | number;
  color?: ColorValue;
  /** Layout classes only (margins, alignment); set the colour with `color`. */
  className?: string;
  /**
   * What a screen reader says. Without one the icon is decorative and
   * hidden, which is right when a text label sits next to it.
   */
  accessibilityLabel?: string;
};

/**
 * Material Symbols Rounded (weight 400, outlined, optical size 24), drawn
 * from the icon font loaded in app/_layout.tsx: the font turns the icon's
 * name into its glyph.
 */
export function AppIcon({
  name,
  size = 'md',
  color = themeColors.inkPrimary,
  className,
  accessibilityLabel,
}: AppIconProps) {
  const fontSize = typeof size === 'number' ? size : SIZES[size];
  // Without the font the name would show as a clipped word ("chev"); an empty
  // box of the same size keeps the layout and shows nothing instead.
  if (!isLoaded(ICON_FONT)) {
    return <View className={className} style={{ width: fontSize, height: fontSize }} />;
  }
  return (
    <Text
      className={className}
      style={{
        fontFamily: ICON_FONT,
        fontSize,
        lineHeight: fontSize,
        width: fontSize,
        height: fontSize,
        color,
        includeFontPadding: false,
      }}
      // An icon keeps its size when the user enlarges text; the labels beside it grow.
      allowFontScaling={false}
      selectable={false}
      numberOfLines={1}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!accessibilityLabel}
    >
      {name}
    </Text>
  );
}
