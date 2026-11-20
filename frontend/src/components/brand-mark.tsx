import Svg, { Path } from 'react-native-svg';

import { themeColors } from '@/constants/theme';

// The logo on its 1024 grid (the same drawing as assets/images/icon.png,
// made by scripts/draw-logo.py): a clothes hanger whose hook is a
// four-point spark. The view box is cropped to the drawing.
const VIEW_BOX = '140 186 744 650';
/** Width / height of the drawn mark. */
export const BRAND_MARK_ASPECT = 744 / 650;
const ASPECT = BRAND_MARK_ASPECT;
const SPARK =
  'M512 196 C512 268 580 336 652 336 C580 336 512 404 512 476 ' +
  'C512 404 444 336 372 336 C444 336 512 268 512 196 Z';
const HANGER = 'M512 546 L836 788 L188 788 Z';

/** The brand mark, `width` wide, in gold unless told otherwise. */
export function BrandMark({
  width = 72,
  color = themeColors.goldSoft,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <Svg
      width={width}
      height={width / ASPECT}
      viewBox={VIEW_BOX}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={SPARK} fill={color} />
      <Path
        d={HANGER}
        fill="none"
        stroke={color}
        strokeWidth={76}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
