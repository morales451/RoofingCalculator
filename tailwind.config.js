/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f6f8fa',
        line: { DEFAULT: '#e3e8ee', strong: '#c9d1da' },
        ink: { DEFAULT: '#1a1f36', 2: '#3c4257', 3: '#626c7e', 4: '#8a94a6' },
        accent: { 50: '#f0f1fe', 100: '#e1e4fc', 200: '#c5cbf8', 600: '#4b53d0', 700: '#3c43b3', 800: '#323894' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 1px rgba(16, 24, 40, 0.05)',
        panel: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.03)',
        pop: '0 8px 24px -4px rgba(16, 24, 40, 0.14), 0 2px 6px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
}
