import '@/global.css';

// Per-weight imports: each package's index bundles every weight it has.
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { themeColors } from '@/constants/theme';
import { BrandSplash } from '@/features/onboarding';
import { queryClient } from '@/lib/query-client';

// Keep the splash screen up until the fonts are ready, so text never flashes
// in the fallback font.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    // Material Symbols Rounded, weight 400, outlined, optical size 24 (AppIcon).
    MaterialSymbolsRounded: require('@/assets/fonts/MaterialSymbolsRounded.ttf'),
  });
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
          <Stack.Screen
            name="(onboarding)"
            options={{ gestureEnabled: false, animation: 'fade' }}
          />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="upgrade"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
        <StatusBar style="dark" />
        <BrandSplash />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
