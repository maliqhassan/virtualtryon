/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Only the tokens currently in use — see design/react-native/01-design-tokens.md
      // for the full target spec, filled in incrementally per screen.
      colors: {
        primary: 'var(--color-primary)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
        ink: {
          primary: 'var(--color-ink-primary)',
          body: 'var(--color-ink-body)',
          secondary: 'var(--color-ink-secondary)',
          onPrimary: 'var(--color-ink-on-primary)',
        },
        // Neutral ramp is identical in light/dark per the design spec, so no
        // CSS-variable indirection is needed here (unlike the colors above).
        neutral: {
          200: '#E2DED6',
          300: '#C9C3B9',
          500: '#8A8278',
        },
      },
      spacing: {
        xxs: '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
        xxxl: '32px',
        huge: '48px',
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '16px',
        xxl: '20px',
        xxxl: '26px',
      },
    },
  },
  plugins: [],
};
