import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert`'s confirm-with-callback pattern doesn't work on web at
 * all — verified directly in a real browser session: clicking a button
 * that called `Alert.alert` produced no dialog, no error, and no callback,
 * a silent no-op, so the entire destructive-action flow was dead on web.
 * `window.confirm()` is the correct web equivalent; native platforms keep
 * `Alert.alert`'s proper native-styled dialog.
 */
export function confirmDestructiveAction(
  title: string,
  message: string,
  confirmLabel = 'Delete',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
