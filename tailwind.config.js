/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // Blue
          light: '#60a5fa',
          dark: '#1d4ed8',
        },
        secondary: {
          DEFAULT: '#22c55e', // Green
          light: '#4ade80',
          dark: '#16a34a',
        },
        accent: {
          DEFAULT: '#dc2626', // Red
          light: '#ef4444',
          dark: '#b91c1c',
        },
        yellow: {
          DEFAULT: '#eab308',
          light: '#facc15',
          dark: '#ca8a04',
        },
        gray: {
          light: '#f3f4f6',
          DEFAULT: '#9ca3af',
          dark: '#4b5563',
        }
      },
    },
  },
  plugins: [],
} 