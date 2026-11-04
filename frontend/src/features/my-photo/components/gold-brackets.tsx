import { View } from 'react-native';

import { themeColors } from '@/constants/theme';

const CORNERS = [
  { top: 16, left: 16, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  { top: 16, right: 16, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  { bottom: 16, left: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  { bottom: 16, right: 16, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },
] as const;

/** The gold camera-frame corners drawn over the photo slot. */
export function GoldBrackets() {
  return (
    <>
      {CORNERS.map((corner, index) => (
        <View
          key={index}
          pointerEvents="none"
          className="absolute h-[26px] w-[26px]"
          style={{ ...corner, borderColor: themeColors.goldSoft }}
        />
      ))}
    </>
  );
}
