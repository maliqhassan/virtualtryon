import '@/global.css';

import { InstrumentSerif_400Regular, useFonts } from '@expo-google-fonts/instrument-serif';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { themeColors } from '@/constants/theme';
import { queryClient } from '@/lib/query-client';

// Keep the splash screen up until the display font is ready, so titles
// never flash in the fallback font.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ InstrumentSerif_400Regular });
  const ready = fontsLoaded || !!fontError; // a failed font falls back, it never blocks the app

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: themeColors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen
            name="upgrade"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
