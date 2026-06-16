/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        game: ['Nunito', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 1s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pop': 'pop 0.3s ease-out',
        'shake': 'shake 0.4s ease-out',
        'glow': 'glow 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-10px)' },
          '40%': { transform: 'translateX(10px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 158, 11, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};
