import { View } from 'react-native';

import { themeColors } from '@/constants/theme';

import { AppIcon } from './app-icon';

/**
 * The design's filled check_circle / cancel badges on a white disc. Drawn as
 * a coloured circle with a white glyph, because the bundled icon font is the
 * outlined style only (a second, filled font for two icons isn't worth it).
 */
export function FilledBadge({ kind, size = 32 }: { kind: 'do' | 'dont'; size?: number }) {
  const inner = Math.round(size * 0.66);
  return (
    <View
      className="items-center justify-center rounded-full bg-surface"
      style={{ width: size, height: size, boxShadow: '0px 2px 8px rgba(22, 19, 15, 0.1)' }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: inner,
          height: inner,
          backgroundColor: kind === 'do' ? themeColors.success : themeColors.error,
        }}
      >
        <AppIcon
          name={kind === 'do' ? 'check' : 'close'}
          size={Math.round(inner * 0.72)}
          color={themeColors.surface}
        />
      </View>
    </View>
  );
}
