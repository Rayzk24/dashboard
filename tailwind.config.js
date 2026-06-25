/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        paper: '#fafafa',
        forest: {
          DEFAULT: '#0f3d2e',
          hover: '#14532d',
          soft: '#dcfce7',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 18px 60px rgba(10, 10, 10, 0.08)',
      },
    },
  },
  plugins: [],
};
