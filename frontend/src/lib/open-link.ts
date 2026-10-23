import { Alert, Linking } from 'react-native';

/** Opens a web page in the phone's browser, and says so if it can't. Only
 * http(s) links are opened, whatever a caller passes. */
export async function openExternalLink(url: string): Promise<void> {
  try {
    if (!/^https?:\/\//i.test(url)) throw new Error('Not a web link');
    await Linking.openURL(url);
  } catch {
    Alert.alert('Couldn’t open the link', 'Please try again in a moment.');
  }
}
