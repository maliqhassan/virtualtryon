import { Alert, Linking } from 'react-native';

/** Opens a web page in the phone's browser, and says so if it can't. */
export async function openExternalLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Couldn’t open the link', 'Please try again in a moment.');
  }
}
