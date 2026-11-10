import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

/**
 * The Photo access screen (handoff v2.1 change 2) comes before the first
 * photo picker. Shared code (hooks/use-image-picker.ts) awaits
 * `ensurePhotoAccess()`; the screen (features/photo-access) answers with
 * `settlePhotoAccess()` when it closes, so the picker opens only after the
 * modal has gone.
 */

export const PHOTO_ACCESS_HREF = '/permissions/photos' as Href;

/** granted: open the picker · camera: the caller opens its camera · dismissed: do nothing. */
export type PhotoAccessOutcome = 'granted' | 'camera' | 'dismissed';

const SEEN_KEY = 'photo-access-seen';
let waiting: ((outcome: PhotoAccessOutcome) => void) | null = null;

async function seenBefore(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === '1';
  } catch {
    return false;
  }
}

/**
 * Resolves at once with "granted" when access is granted and the screen was
 * shown before. Otherwise opens the screen and waits for it. On Android the
 * system photo picker needs no permission, so there it's shown once only.
 */
export async function ensurePhotoAccess(options: {
  cameraAvailable: boolean;
}): Promise<PhotoAccessOutcome> {
  // A second tap while the screen is already up: that screen answers the first.
  if (waiting) return 'dismissed';
  const seen = await seenBefore();
  // Android's system photo picker needs no permission: explain once, then go.
  if (Platform.OS === 'android' && seen) return 'granted';
  let granted: boolean;
  try {
    granted = (await ImagePicker.getMediaLibraryPermissionsAsync()).granted;
  } catch {
    // Can't tell: go on to the picker, which asks the system itself.
    return 'granted';
  }
  if (granted && seen) return 'granted';

  return new Promise((resolve) => {
    waiting = resolve;
    router.push({
      pathname: PHOTO_ACCESS_HREF as never,
      params: { camera: options.cameraAvailable ? '1' : '0' },
    });
  });
}

/** Called once by the screen as it goes away. */
export function settlePhotoAccess(outcome: PhotoAccessOutcome): void {
  AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
  const resolve = waiting;
  waiting = null;
  resolve?.(outcome);
}
