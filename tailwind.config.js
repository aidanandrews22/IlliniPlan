/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#FFFFFF',
          dark: '#1F2937',
        },
        primary: '#E84A27', // Illinois Orange
        secondary: '#13294B', // Illinois Blue
      },
    },
  },
  plugins: [],
}