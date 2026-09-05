/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0b2b68',
          navydark: '#071d47',
          blue: '#1d4ed8',
          accent: '#2563eb',
        },
      },
    },
  },
  plugins: [],
}
