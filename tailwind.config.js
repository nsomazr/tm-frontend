/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        app: {
          bg: 'var(--color-app-bg)',
          surface: 'var(--color-app-surface)',
          elevated: 'var(--color-app-elevated)',
          subtle: 'var(--color-app-muted)',
          border: 'var(--color-app-border)',
          'border-strong': 'var(--color-app-border-strong)',
          text: 'var(--color-app-text)',
          secondary: 'var(--color-app-text-secondary)',
          muted: 'var(--color-app-text-muted)',
          'accent-soft': 'var(--color-app-accent-soft)',
        },
        terra: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        gold: {
          400: '#F5E6A3',
          500: '#E87722',
          600: '#C4A035',
        },
        slate: {
          850: '#172033',
        },
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-dark': '0 4px 24px -4px rgba(0, 0, 0, 0.45), 0 8px 16px -6px rgba(0, 0, 0, 0.35)',
        glow: '0 0 40px -10px rgba(22, 163, 74, 0.3)',
        'glow-dark': '0 0 48px -12px rgba(74, 222, 128, 0.22)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
