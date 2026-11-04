import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

/** The design's placeholder photography: 45° stripes, 7px per colour. */
export const STRIPES = {
  warm: ['#EFEBE4', '#E6E1D8'],
  lilac: ['#E9E6EF', '#DEDAE7'],
  sage: ['#E5EBE6', '#D9E1DB'],
  blush: ['#F1E9E2', '#E7DDD3'],
  dark: ['#2E2720', '#26201A'],
} as const;

export type StripeTone = keyof typeof STRIPES;
/** The light tones in the order the design cycles through them. */
export const LIGHT_STRIPES: StripeTone[] = ['warm', 'lilac', 'sage', 'blush'];

/** Fills its parent (absolutely positioned) with diagonal stripes. */
export function StripeFill({ tone = 'warm', period = 7 }: { tone?: StripeTone; period?: number }) {
  const id = `stripes-${useId().replace(/:/g, '')}`;
  const [a, b] = STRIPES[tone];
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern
          id={id}
          patternUnits="userSpaceOnUse"
          width={period * 2}
          height={period * 2}
          patternTransform="rotate(45)"
        >
          <Rect x={0} y={0} width={period} height={period * 2} fill={a} />
          <Rect x={period} y={0} width={period} height={period * 2} fill={b} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
