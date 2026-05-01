/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
      },
      animation: {
        bounce2: 'bounce 0.8s infinite',
        shake: 'shake 0.4s ease-in-out',
        flash: 'flash 0.3s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        flash: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
      },
    },
  },
  plugins: [],
}
