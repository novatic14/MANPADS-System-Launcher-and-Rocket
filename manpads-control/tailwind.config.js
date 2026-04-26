module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#171717',
          deep: '#0f0f0f',
          light: '#fafafa',
          'light-deep': '#ffffff',
        },
        text: {
          primary: '#fafafa',
          'primary-light': '#171717',
          secondary: '#b4b4b4',
          'secondary-light': '#525252',
          muted: '#898989',
          'muted-light': '#a3a3a3',
        },
        border: {
          subtle: '#242424',
          DEFAULT: '#2e2e2e',
          prominent: '#363636',
          accent: 'rgba(62, 207, 142, 0.3)',
          'light-subtle': '#e5e5e5',
          'light-default': '#d4d4d4',
          'light-prominent': '#a3a3a3',
        },
        brand: {
          green: '#3ecf8e',
          link: '#00c573',
          'green-dark': '#2d9d6c',
        },
        crimson: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        slate: {
          light: '#f4f4f5',
        },
      },
      fontFamily: {
        sans: ['Circular', 'Helvetica Neue', 'sans-serif'],
        mono: ['Source Code Pro', 'Menlo', 'monospace'],
      },
      borderRadius: {
        pill: '9999px',
        card: '16px',
        standard: '6px',
      },
      lineHeight: {
        hero: '1.00',
        tight: '1.14',
        normal: '1.50',
      },
      letterSpacing: {
        code: '1.2px',
        card: '-0.16px',
      },
    },
  },
  plugins: [],
}