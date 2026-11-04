import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FadeInView } from '@/components/fade-in-view';
import { GradientFill, NightGlow } from '@/components/gradient-fill';
import { StripeFill } from '@/components/stripe-fill';
import { type Garment, useGarmentsQuery } from '@/features/wardrobe';
import { resolveMediaUrl } from '@/lib/media-url';

import { OnboardingFrame } from '../components/onboarding-frame';
import { markOnboardingSeen } from '../onboarding-flag';
import { ONBOARDING_PLANS_HREF } from '../routes';

function MosaicTile({ garment, label }: { garment?: Garment; label: string }) {
  return (
    <View className="flex-1 justify-end overflow-hidden rounded-[18px] p-[10px]">
      {garment ? (
        <Image
          source={{ uri: resolveMediaUrl(garment.imageUrl) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={garment.title}
        />
      ) : (
        <StripeFill tone="dark" period={8} />
      )}
      {!garment && <Text className="font-mono text-[9px] text-neutral-500">{label}</Text>}
    </View>
  );
}

/**
 * The reveal at the end of onboarding: the pieces just added, as a mosaic.
 * Daily outfits aren't built yet, so it shows the wardrobe that's started
 * rather than an invented outfit or score.
 */
export function ReadyScreen() {
  const { data: garments = [] } = useGarmentsQuery();
  const count = garments.length;
  const [first, second, third] = garments;

  const finish = async () => {
    await markOnboardingSeen();
    // replace: back never returns into onboarding.
    router.replace(ONBOARDING_PLANS_HREF);
  };

  return (
    <OnboardingFrame
      dark
      backdrop={<NightGlow center={{ x: 0.5, y: 0 }} />}
      footer={<AppButton label="Start my day" variant="cream" onPress={finish} />}
    >
      <View className="mt-xxl flex-row items-center gap-[10px]">
        <View className="h-[30px] w-[30px] overflow-hidden rounded-full">
          <GradientFill
            kind="radial"
            center={{ x: 0.35, y: 0.3 }}
            radius={{ x: 0.75, y: 0.75 }}
            stops={[
              { offset: 0, color: '#E7C77A' },
              { offset: 1, color: '#B4713F' },
            ]}
          />
        </View>
        <Text className="font-mono text-[10px] uppercase tracking-[1.6px] text-gold-overline">
          Your wardrobe · from Noor
        </Text>
      </View>
      <FadeInView>
        <Text
          className="mt-[18px] font-display text-[40px] leading-[41px] text-cream"
          accessibilityRole="header"
        >
          {count > 0 ? 'Your closet,' : 'Your style,'}
          {'\n'}
          <Text className="font-display-italic text-gold-soft">
            {count > 0 ? 'started.' : 'all set.'}
          </Text>
        </Text>
      </FadeInView>
      <FadeInView index={2}>
        <View className="mt-[22px] flex-row gap-sm" style={{ aspectRatio: 1.25 }}>
          <View style={{ flex: 1.5 }} className="flex-row">
            <MosaicTile garment={first} label="your first piece" />
          </View>
          <View className="flex-1 gap-sm">
            <MosaicTile garment={second} label="a second piece" />
            <MosaicTile garment={third} label="a third piece" />
          </View>
        </View>
      </FadeInView>
      <FadeInView index={4}>
        <View className="mt-[18px] flex-row items-center gap-md">
          <Text className="font-display text-[54px] leading-[54px] text-cream">{count}</Text>
          <Text className="flex-1 font-sans text-[13px] leading-[20px] text-night-body">
            {count > 0
              ? `${count === 1 ? 'piece' : 'pieces'} in your wardrobe. Try any of them on your photo, or paste a link from any store.`
              : 'Add pieces any time from Wardrobe, or paste a link from any store to try it on.'}
          </Text>
        </View>
      </FadeInView>
    </OnboardingFrame>
  );
}
