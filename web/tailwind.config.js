/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00236f',
          container: '#1e3a8a',
          fixed: '#dce1ff',
          'fixed-dim': '#b6c4ff',
        },
        'on-primary': '#ffffff',
        'on-primary-container': '#90a8ff',
        secondary: {
          DEFAULT: '#006a61',
          container: '#86f2e4',
          'fixed-dim': '#6bd8cb',
        },
        'on-secondary': '#ffffff',
        'on-secondary-container': '#006f66',
        surface: {
          DEFAULT: '#faf8ff',
          dim: '#d2d9f4',
          bright: '#faf8ff',
          container: {
            lowest: '#ffffff',
            low: '#f2f3ff',
            DEFAULT: '#eaedff',
            high: '#e2e7ff',
            highest: '#dae2fd',
          },
        },
        'on-surface': '#131b2e',
        'on-surface-variant': '#444651',
        outline: {
          DEFAULT: '#757682',
          variant: '#c5c5d3',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        tertiary: {
          DEFAULT: '#3e2400',
          container: '#5c3800',
          fixed: '#ffddb8',
          'fixed-dim': '#ffb95f',
        },
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#ef9900',
        'on-tertiary-fixed-variant': '#653e00',
        college: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Malayalam', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
