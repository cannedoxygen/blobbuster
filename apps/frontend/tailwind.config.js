const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Blockbuster Brand Colors
      colors: {
        blockbuster: {
          blue: '#002D72', // Primary Blockbuster Blue
          darkBlue: '#001144', // Darker Blue
          yellow: '#FFD700', // Blockbuster Yellow/Gold
          lightYellow: '#FFC700', // Lighter Yellow
          black: '#000033', // Deep Black/Blue
          white: '#FFFFFF',
        },
        // Dark theme colors
        dark: {
          50: '#18181b',
          100: '#27272a',
          200: '#3f3f46',
          300: '#52525b',
          400: '#71717a',
          500: '#a1a1aa',
          600: '#d4d4d8',
          700: '#e4e4e7',
          800: '#f4f4f5',
          900: '#fafafa',
        },
        // Neon accent colors for the 80s vibe
        neon: {
          blue: '#00f5ff',
          pink: '#ff007f',
          green: '#39ff14',
          purple: '#bf00ff',
          yellow: '#ffff00',
        }
      },

      // Typography
      fontFamily: {
        'heading': ['"Archivo Black"', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'display': ['var(--font-space-grotesk)', 'Inter', 'sans-serif'],
      },

      // Animations
      animation: {
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
        'blockbuster-hover': 'blockbusterHover 0.1s ease',
      },

      keyframes: {
        neonPulse: {
          '0%, 100%': { textShadow: '0 0 10px #FFD700, 0 0 20px #FFD700, 0 0 30px #FFD700' },
          '50%': { textShadow: '0 0 20px #FFD700, 0 0 30px #FFD700, 0 0 40px #FFD700' },
        },
        blockbusterHover: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(-3px, -3px)' },
        },
      },

      // Box shadows
      boxShadow: {
        'blockbuster': '4px 4px 0 #000033',
        'blockbuster-hover': '6px 6px 0 #000033',
        'blockbuster-lg': '8px 8px 0 #000033',
        'neon': '0 0 20px rgba(0, 245, 255, 0.5)',
      },
    },
  },
  plugins: [],
};
