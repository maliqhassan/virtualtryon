/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // The v2 design tokens, added in one go as the handoff's first build step
      // (design_handoff_ai_stylist/04-react-native.md §4 and §10) so the screen
      // restyles that follow share one palette.
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
        // v2 additions (design_handoff_ai_stylist/04-react-native.md §4).
        secondary: '#4A5578',
        warning: '#C9922E',
        // Primary fill on dark screens.
        cream: '#F6F1E8',
        gold: { DEFAULT: '#C9A227', soft: '#E7C77A', overline: '#D9B26A' },
        // The dark stage (Try-On, Plans, onboarding photo steps).
        night: { DEFAULT: '#12110F', surface: '#1C1A17', text: '#F2EFEA', body: '#B9B1A6' },
        match: {
          perfectFg: '#2E7050',
          perfectBg: '#DCF0E4',
          goodFg: '#7E5A18',
          goodBg: '#F5EBD3',
          poorFg: '#8E3324',
          poorBg: '#F7E5E1',
        },
        callout: { bg: '#F7F3E9', border: '#E5DCC0' },
        // Neutral ramp is identical in light/dark per the design spec, so no
        // CSS-variable indirection is needed here (unlike the colors above).
        neutral: {
          100: '#F0EDE7',
          200: '#E2DED6',
          300: '#C9C3B9',
          400: '#A39B90',
          500: '#8A8278',
          600: '#6B655D',
          700: '#4E4841',
          900: '#16130F',
        },
      },
      // Each weight is its own family: React Native can't derive weights from
      // one name, so use `font-sans-bold`, never `font-sans font-bold`.
      // Manrope for interface text, Instrument Serif for display (titles,
      // outfit names, big numbers), IBM Plex Mono for overlines and metadata.
      fontFamily: {
        sans: ['Manrope_500Medium'],
        'sans-semibold': ['Manrope_600SemiBold'],
        'sans-bold': ['Manrope_700Bold'],
        display: ['InstrumentSerif_400Regular'],
        'display-italic': ['InstrumentSerif_400Regular_Italic'],
        mono: ['IBMPlexMono_500Medium'],
        'mono-semibold': ['IBMPlexMono_600SemiBold'],
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
        hero: '28px',
        sheet: '30px',
      },
    },
  },
  plugins: [],
};
