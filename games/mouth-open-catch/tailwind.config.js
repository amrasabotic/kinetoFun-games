/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { game: ['Fredoka One', 'Nunito', 'sans-serif'] },
      colors: {
        game: {
          primary: '#7C3AED',
          secondary: '#F59E0B',
          accent: '#10B981',
          danger: '#EF4444',
          dark: '#0F0A1E',
        },
      },
    },
  },
  plugins: [],
};
