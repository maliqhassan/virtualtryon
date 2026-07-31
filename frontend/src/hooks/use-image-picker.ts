import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import type { PickedImage } from '@/types';

export type ImagePickerFault = 'permission_denied' | 'unknown_error';

function toPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    fileName: asset.fileName,
  };
}

/**
 * Gallery picking only — camera capture is `CameraCaptureView`
 * (src/components/camera-capture-view.tsx), a real in-app camera screen,
 * not an imperative launcher call.
 *
 * Deliberately returns the picked image rather than writing it anywhere:
 * this hook's only job is sourcing an image from the OS. Validating it and
 * deciding where it's stored is the calling feature's job, not this hook's.
 */
export function useImagePicker() {
  const [fault, setFault] = useState<ImagePickerFault | null>(null);

  const pickFromGallery = useCallback(async (): Promise<PickedImage | null> => {
    setFault(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFault('permission_denied');
      return null;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return null;
      return toPickedImage(result.assets[0]);
    } catch {
      setFault('unknown_error');
      return null;
    }
  }, []);

  return { pickFromGallery, fault, clearFault: () => setFault(null) };
}
