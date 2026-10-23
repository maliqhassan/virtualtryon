import { Redirect, Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { themeColors } from '@/constants/theme';
import { useOnboardingSeen } from '@/features/onboarding/onboarding-flag';

export default function TabsLayout() {
  const onboardingSeen = useOnboardingSeen();

  if (onboardingSeen === null) return null; // reading the flag, a few ms
  if (!onboardingSeen) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      // "index" (Try On) is listed first so it's the screen the app opens on;
      // FloatingTabBar decides the visual order and puts it in the centre.
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Try On' }} />
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="looks" options={{ title: 'Looks' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
