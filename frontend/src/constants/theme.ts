/**
 * The app's existing colour tokens (src/global.css) as plain values, for the
 * few places that can't use NativeWind classes: navigator options (tab bar
 * tint) and SVG icon strokes. Keep in sync with global.css.
 */
export const themeColors = {
  primary: '#b4713f',
  background: '#f6f4f0',
  surface: '#ffffff',
  border: 'rgba(22, 19, 15, 0.08)',
  inkPrimary: '#16130f',
  inkSecondary: '#6b655d',
  neutral500: '#8a8278',
} as const;
