/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#1A3C34',
          light: '#22504A',
          mid: '#1E4840',
        },
        amber: {
          DEFAULT: '#F5A623',
          dark: '#E09310',
        },
        bg: '#F9F6F1',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
