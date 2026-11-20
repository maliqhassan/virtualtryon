import { router } from 'expo-router';
import { Text } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { useTabBarHeight } from '@/components/floating-tab-bar';
import { PressableScale } from '@/components/pressable-scale';
import { themeColors } from '@/constants/theme';
import { TRY_ON_HOME_HREF } from '@/features/tryon';

/**
 * "Start a new outfit" (handoff v2.1 change 3), floating just above the
 * tab bar on Today only, so the main job is always one tap away. Drawn by
 * the Today screen over its own content, above the floating tab bar and
 * clear of its raised Try-On button.
 */
export function StartOutfitButton() {
  const tabBarHeight = useTabBarHeight();
  return (
    <PressableScale
      onPress={() => router.push(TRY_ON_HOME_HREF)}
      accessibilityRole="button"
      accessibilityLabel="Start a new outfit"
      pressedScale={0.97}
      // Above the floating bar, clear of its raised Try-On button (28).
      containerStyle={{ position: 'absolute', left: 18, right: 18, bottom: tabBarHeight + 28 }}
      className="h-[58px] flex-row items-center justify-center gap-[9px] rounded-full bg-inverse"
      style={{ boxShadow: '0px 12px 28px rgba(22, 19, 15, 0.28)' }}
    >
      <AppIcon name="auto_awesome" size={20} color={themeColors.goldSoft} />
      <Text className="font-sans-bold text-[15.5px] text-ink-onPrimary">Start a new outfit</Text>
    </PressableScale>
  );
}
