/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#02A3FE',
        'primary-dark': '#0090e0',
      }
    },
  },
  plugins: [],
}