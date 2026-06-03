/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        foreground: '#FAFAFA',
        muted: '#1A1A1A',
        mutedForeground: '#737373',
        accent: '#FF3D00',
        accentForeground: '#0A0A0A',
        border: '#262626',
        input: '#1A1A1A',
        card: '#0F0F0F',
        cardForeground: '#FAFAFA',
        ring: '#FF3D00',
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tighter: '-0.06em',
        tight: '-0.04em',
        normal: '-0.01em',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.2em',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      lineHeight: {
        none: '1',
        tight: '1.1',
        snug: '1.25',
        normal: '1.6',
        relaxed: '1.75',
      },
    },
  },
  plugins: [],
};
