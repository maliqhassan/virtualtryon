import { Stack } from 'expo-router';

/** First-run steps: fade between them, and no swipe-back into a finished step. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />;
}
