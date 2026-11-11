/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        trade: {
          bg: '#121620',
          panel: '#1a1f2e',
          card: '#222838',
          border: '#2e354b',
          green: '#00c679',
          greenHover: '#00e089',
          greenGlow: 'rgba(0, 198, 121, 0.25)',
          red: '#ff3d5a',
          redHover: '#ff546e',
          redGlow: 'rgba(255, 61, 90, 0.25)',
          gold: '#f0b90b',
        },
      },
    },
  },
  plugins: [],
};

