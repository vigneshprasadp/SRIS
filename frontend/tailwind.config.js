/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          pink: '#FFCBE1',
          green: '#D6E5BD',
          yellow: '#F9E1A8',
          blue: '#BCD8EC',
          lavender: '#DCCCEC',
          peach: '#FFDAB4',
          bg: '#F8F7F5',
        }
      }
    },
  },
  plugins: [],
}
