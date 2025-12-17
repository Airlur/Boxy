/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        vercel: {
          bg: '#f8f9fa',
          card: '#ffffff',
          border: '#eaeaea',
          text: '#000000',
          textSec: '#666666',
        }
      },
      animation: {
        'modal-in': 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        modalIn: {
          '0%': { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        }
      }
    },
  },
  plugins: [],
}