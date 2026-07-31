import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import type { PickedImage } from '@/types';

type CameraCaptureViewProps = {
  onCapture: (image: PickedImage) => void;
  onCancel: () => void;
};

/**
 * A minimal in-app camera screen: live preview + shutter + cancel. No
 * flash/front-camera-toggle/zoom/guides — those are real future polish, not
 * part of "capture a photo," and weren't part of what was asked for.
 *
 * Rendered as a full-screen overlay by the calling screen (conditional on a
 * local `showCamera` boolean), not a separate route — avoids passing a
 * captured image back across a route boundary, which Expo Router has no
 * built-in typed mechanism for.
 */
export function CameraCaptureView({ onCapture, onCancel }: CameraCaptureViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo) {
        onCapture({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          mimeType: 'image/jpeg',
        });
      }
    } catch {
      // No dedicated fault state for a capture failure yet — treated as a
      // no-op (user stays on the camera screen and can try again). Revisit
      // if this proves to happen often in practice.
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  if (!permission || !permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-md bg-ink-primary px-xl">
        <Text className="text-center text-ink-onPrimary">
          Camera access is needed to take a photo.
        </Text>
        {permission && !permission.canAskAgain ? (
          <Text className="text-center text-ink-onPrimary opacity-70">
            Enable it in your device settings, then come back.
          </Text>
        ) : (
          <AppButton label="Grant Camera Access" variant="primary" onPress={requestPermission} />
        )}
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          className="px-md py-sm"
        >
          <Text className="text-base font-semibold text-ink-onPrimary">Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View className="flex-row items-center justify-between px-xl py-lg">
        <Pressable
          onPress={onCancel}
          disabled={isCapturing}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          className="px-md py-sm"
        >
          <Text className="text-base font-semibold text-ink-onPrimary">Cancel</Text>
        </Pressable>

        <Pressable
          onPress={handleCapture}
          disabled={isCapturing}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          hitSlop={8}
          className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white"
        >
          <View className="h-[56px] w-[56px] rounded-full bg-white" />
        </Pressable>

        {/* Balances the "Cancel" text on the left so the shutter stays centered. */}
        <View className="w-[72px]" />
      </View>
    </SafeAreaView>
  );
}
