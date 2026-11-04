/**
 * The app's colour tokens (src/global.css and tailwind.config.js) as plain
 * values, for the few places that can't use NativeWind classes: navigator
 * options, icon colours and SVG strokes. Keep in sync with those files.
 */
export const themeColors = {
  primary: '#b4713f',
  background: '#f6f4f0',
  surface: '#ffffff',
  border: 'rgba(22, 19, 15, 0.08)',
  error: '#b4402e',
  success: '#3e8f63',
  inkPrimary: '#16130f',
  inkSecondary: '#6b655d',
  neutral300: '#c9c3b9',
  neutral400: '#a39b90',
  neutral500: '#8a8278',
  // The dark stage (Try-On, Plans, the onboarding photo steps).
  cream: '#f6f1e8',
  night: '#12110f',
  nightSurface: '#1c1a17',
  nightText: '#f2efea',
  nightBody: '#b9b1a6',
  gold: '#c9a227',
  goldSoft: '#e7c77a',
  secondary: '#4a5578',
} as const;
