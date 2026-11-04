import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { GradientFill } from '@/components/gradient-fill';
import { PressableScale } from '@/components/pressable-scale';
import { StripeFill } from '@/components/stripe-fill';

import { LOOKBOOK_HREF } from '../routes';

/** The editorial banner into the seasonal lookbook. */
export function LookbookBanner() {
  return (
    <PressableScale
      onPress={() => router.push(LOOKBOOK_HREF)}
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel="Eid edit, open lookbook"
      containerClassName="mb-xl mt-[14px]"
      className="h-[178px] overflow-hidden rounded-[24px] bg-[#2E2210]"
    >
      <StripeFill tone="dark" period={10} />
      <GradientFill
        kind="linear"
        horizontal
        stops={[
          { offset: 0, color: '#1A1206', opacity: 0.92 },
          { offset: 0.6, color: '#1A1206', opacity: 0.5 },
          { offset: 1, color: '#1A1206', opacity: 0.1 },
        ]}
      />
      <View className="absolute left-[18px] right-[120px] top-[18px]">
        <Text className="font-mono text-[9.5px] tracking-[1.7px] text-gold-soft">
          EID EDIT · LOOKBOOK
        </Text>
        <Text className="mt-[9px] font-display text-[28px] leading-[29px] text-[#F4EBD9]">
          Gold hour,{'\n'}
          <Text className="font-display-italic">softly worn</Text>
        </Text>
        <Text className="mt-md font-sans-bold text-[12px] text-gold-soft">Open lookbook →</Text>
      </View>
      <Text className="absolute bottom-md right-[14px] font-mono text-[8.5px] text-[rgba(244,235,217,0.4)]">
        [ editorial ]
      </Text>
    </PressableScale>
  );
}
