import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Line icons for the bottom tab bar, drawn with react-native-svg (already a
 * dependency) rather than adding an icon-font package for four glyphs.
 */
type IconProps = { color: ColorValue; size?: number };

const STROKE = 1.8;

export function TryOnIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WardrobeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 7.5V6.8a1.8 1.8 0 1 1 1.8 1.8L12 9.8 3.6 15.6a1.2 1.2 0 0 0 .7 2.2h15.4a1.2 1.2 0 0 0 .7-2.2L12 9.8"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LooksIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AccountIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8.5} r={3.8} stroke={color} strokeWidth={STROKE} />
      <Path
        d="M4.5 20c1.2-3.5 4.1-5.2 7.5-5.2s6.3 1.7 7.5 5.2"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ShopIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 8h13l-1 11.2a1.5 1.5 0 0 1-1.5 1.3H8a1.5 1.5 0 0 1-1.5-1.3L5.5 8z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M9 8V6.5a3 3 0 0 1 6 0V8"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}
