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
        // From the design system (design/figma/01-foundation.md §3): the dark
        // "machine is speaking" surface, gold for premium moments, and a
        // muted fill for chips and empty slots.
        inverse: '#16130F',
        accent: '#C9A227',
        muted: '#F0EDE7',
        // Neutral ramp is identical in light/dark per the design spec, so no
        // CSS-variable indirection is needed here (unlike the colors above).
        neutral: {
          100: '#F0EDE7',
          200: '#E2DED6',
          300: '#C9C3B9',
          500: '#8A8278',
        },
      },
      // Instrument Serif is the design system's display face: screen titles,
      // outfit names and big numbers. Body text stays on the platform font.
      fontFamily: {
        display: ['InstrumentSerif_400Regular'],
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
