import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { ensurePhotoAccess } from '@/lib/photo-access';
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
 * Before picking, the Photo access screen explains and asks (handoff v2.1
 * change 2). Pass `onUseCamera` when the screen has a camera: the Photo
 * access screen then offers "Use the camera instead" and calls it.
 *
 * Deliberately returns the picked image rather than writing it anywhere:
 * this hook's only job is sourcing an image from the OS. Validating it and
 * deciding where it's stored is the calling feature's job, not this hook's.
 */
export function useImagePicker(options: { onUseCamera?: () => void } = {}) {
  const [fault, setFault] = useState<ImagePickerFault | null>(null);
  const { onUseCamera } = options;

  /** The Photo access screen first (lib/photo-access.ts); true to go on picking. */
  const askFirst = useCallback(async (): Promise<boolean> => {
    const outcome = await ensurePhotoAccess({ cameraAvailable: !!onUseCamera });
    if (outcome === 'camera') onUseCamera?.();
    return outcome === 'granted';
  }, [onUseCamera]);

  const pickFromGallery = useCallback(async (): Promise<PickedImage | null> => {
    setFault(null);
    if (!(await askFirst())) return null;
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
  }, [askFirst]);

  /** Several photos at once, in the order picked (onboarding's first pieces). */
  const pickManyFromGallery = useCallback(
    async (limit: number): Promise<PickedImage[]> => {
      setFault(null);
      if (!(await askFirst())) return [];
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFault('permission_denied');
        return [];
      }
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
          allowsMultipleSelection: true,
          orderedSelection: true,
          selectionLimit: limit,
        });
        return result.canceled ? [] : result.assets.map(toPickedImage);
      } catch {
        setFault('unknown_error');
        return [];
      }
    },
    [askFirst],
  );

  return { pickFromGallery, pickManyFromGallery, fault, clearFault: () => setFault(null) };
}
