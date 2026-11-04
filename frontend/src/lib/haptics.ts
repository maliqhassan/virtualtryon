import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** The light tick for tab changes and chip/option toggles. No-op on web. */
export function selectionFeedback(): void {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}
