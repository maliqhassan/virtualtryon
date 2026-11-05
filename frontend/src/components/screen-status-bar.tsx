import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * A screen's status bar style, applied only while the screen is in focus.
 * Tabs and stack screens underneath stay mounted, so a plain <StatusBar>
 * on a dark screen kept the icons white on the light screens after it.
 * With this unmounted on blur, the root's dark style applies again.
 */
export function ScreenStatusBar({ style }: { style: 'light' | 'dark' }) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={style} /> : null;
}
