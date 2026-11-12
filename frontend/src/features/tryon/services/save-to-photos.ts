import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';

export type SaveToPhotosResult = 'saved' | 'denied';

/**
 * Downloads a try-on result and adds it to the phone's photo library
 * (handoff v2.1 change 6: Save also saves to the library). Asks for
 * write-only access, so the app can add photos but never read the
 * library. Throws if the download or the save fails.
 *
 * SDK 57: `Asset.create()` replaces the removed `saveToLibraryAsync()`.
 */
export async function saveToPhotos(imageUrl: string): Promise<SaveToPhotosResult> {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';

  const folder = new Directory(Paths.cache, 'try-on-results');
  folder.create({ idempotent: true, intermediates: true });
  // A named file with an image extension: the library goes by it, and the
  // URL may not end in one.
  const extension = /\.png(?:$|\?)/i.test(imageUrl) ? 'png' : 'jpg';
  const target = new File(folder, `try-on.${extension}`);
  const file = await File.downloadFileAsync(imageUrl, target, { idempotent: true });
  try {
    await Asset.create(file.uri);
  } finally {
    // The library keeps its own copy.
    file.delete();
  }
  return 'saved';
}
