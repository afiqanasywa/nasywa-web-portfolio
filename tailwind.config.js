/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cabin: {
          night: '#1a1016',
          deep: '#2a1a14',
          log: '#5b3a29',
          plank: '#8a5a3b',
        },
        rose: { soft: '#f4a7b9', deep: '#d97a95', blush: '#ffd3de' },
        rosegold: '#c9956b',
        sage: { DEFAULT: '#8fae8b', light: '#b9d6a3', dark: '#5f8f57' },
        cream: { DEFAULT: '#efe0c8', light: '#fbf1e1' },
        amber: { glow: '#ffc874', warm: '#f2a541' },
        parchment: '#fbefdc',
        ink: '#2b1a24',
        gold: { DEFAULT: '#e8c070', dark: '#a8792e', light: '#fff0b8' },
      },
      fontFamily: {
        pixel: ['"Pixelify Sans"', 'ui-monospace', 'monospace'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
