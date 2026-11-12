import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { GradientFill } from '@/components/gradient-fill';
import { IconButton } from '@/components/icon-button';
import { ScreenStatusBar } from '@/components/screen-status-bar';

import { stepFor, useTryOnProgress } from '../hooks/use-tryon-progress';
import type { TryOnJobStatus } from '../types';

import { ProgressRing } from './progress-ring';

/**
 * While a try-on is made (handoff v2.1 change 5): a blurred copy of the
 * portrait behind a ring filling 0-100% from the job's real status, the
 * current step. If polling has given up, the note becomes "still in the
 * queue" with a manual check. The design's "you can leave and we'll notify
 * you" waits for push notifications, which aren't built yet.
 */
export function GeneratingView({
  status,
  portraitUri,
  pieceTitle,
  timedOut,
  onCheckAgain,
  onClose,
}: {
  status: TryOnJobStatus | undefined;
  portraitUri: string | null;
  pieceTitle: string | null;
  timedOut: boolean;
  onCheckAgain: () => void;
  onClose: () => void;
}) {
  const progress = useTryOnProgress(status);

  return (
    <View className="flex-1 overflow-hidden bg-night">
      <ScreenStatusBar style="light" />
      {portraitUri && (
        <Image
          source={{ uri: portraitUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={40}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      {/* Darker towards the edges, so the ring and text read on any photo. */}
      <GradientFill
        kind="radial"
        center={{ x: 0.5, y: 0.45 }}
        radius={{ x: 0.7, y: 0.45 }}
        stops={[
          { offset: 0, color: '#12110F', opacity: 0.15 },
          { offset: 1, color: '#12110F', opacity: 0.7 },
        ]}
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="px-xl pt-md">
          <IconButton icon="close" tone="glass" accessibilityLabel="Close" onPress={onClose} />
        </View>

        <View className="flex-1 items-center justify-center px-[34px]">
          <ProgressRing progress={progress} />
          {/* Announced when the step changes, not on every percent. */}
          <Text
            className="mt-[28px] text-center font-sans-bold text-[20px] text-cream"
            accessibilityLiveRegion="polite"
          >
            {timedOut ? 'Still working on it' : stepFor(progress)}
          </Text>
          {timedOut ? (
            <>
              <Text className="mt-sm text-center font-sans text-[13.5px] leading-[21px] text-night-body">
                This is taking longer than usual. Your try-on is still in the queue and will finish
                on its own.
              </Text>
              <View className="mt-lg">
                <AppButton label="Check again" variant="ghostDark" onPress={onCheckAgain} />
              </View>
            </>
          ) : (
            <Text className="mt-sm text-center font-sans text-[13.5px] leading-[21px] text-night-body">
              Trying on{' '}
              <Text className="font-sans-bold text-cream">{pieceTitle ?? 'your piece'}</Text>. It
              usually takes under a minute.
            </Text>
          )}
        </View>

        <Text className="pb-xl text-center font-mono text-[10.5px] text-neutral-400">
          1 credit · refunded automatically if it fails
        </Text>
      </SafeAreaView>
    </View>
  );
}
