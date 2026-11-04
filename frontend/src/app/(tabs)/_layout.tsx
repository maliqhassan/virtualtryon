import { Redirect, Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { themeColors } from '@/constants/theme';
import { WELCOME_HREF, useOnboardingSeen } from '@/features/onboarding';

export default function TabsLayout() {
  const onboardingSeen = useOnboardingSeen();

  if (onboardingSeen === null) return null; // reading the flag, a few ms
  if (!onboardingSeen) return <Redirect href={WELCOME_HREF} />;

  return (
    <Tabs
      // "index" (Today) is listed first so it's the screen the app opens on;
      // FloatingTabBar decides the visual order and raises Try-On in the centre.
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
      <Tabs.Screen
        name="tryon"
        options={{ title: 'Try-On', sceneStyle: { backgroundColor: themeColors.night } }}
      />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
