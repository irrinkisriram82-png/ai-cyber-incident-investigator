/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // dark navy / charcoal surfaces (SPEC §6)
        ink: '#0b1220',
        panel: '#151c2c',
        raised: '#1c2438',
        line: '#2a3550',
        accent: { DEFAULT: '#22d3ee', strong: '#06b6d4', soft: 'rgba(34, 211, 238, 0.12)' },
        muted: '#9fb0cc',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
